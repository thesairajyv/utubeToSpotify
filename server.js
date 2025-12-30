require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const session = require('express-session');
const { encrypt, decrypt } = require('./utils/crypto');

const app = express();
app.use(express.json());

// Security middleware
app.use(helmet());

// Trust proxy when behind a reverse proxy (for secure cookies and HTTPS)
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 100, message: 'Too many requests, please try again later.' });
app.use(limiter);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));

// Session - use secure cookies in production. For production, replace MemoryStore.
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000
  }
}));

// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.get('host')}${req.originalUrl}`);
  }
  next();
});

const PORT = process.env.PORT || 4000;

// In-memory stores for demo purposes (token persistence is in SQLite)
const oauthStateMap = new Map(); // state -> temp data
const spotifyStateMap = new Map();
const { exchangeCodeForToken, refreshToken, searchTrack, createPlaylist, addTracks } = require('./utils/spotify');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function randomId() {
  return crypto.randomBytes(12).toString('hex');
}

// Build Google OAuth consent URL
app.post('/auth/youtube', (req, res) => {
  const state = randomId();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly');

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI not configured' });
  }

  // Save minimal state (could be used to link with an existing account)
  oauthStateMap.set(state, { createdAt: Date.now() });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
  res.json({ url });
});

// OAuth callback - exchange code for tokens
app.get('/auth/youtube/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state || !oauthStateMap.has(state)) {
    return res.status(400).send('Invalid OAuth callback request');
  }

  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokens = tokenRes.data; // access_token, refresh_token, expires_in, scope, token_type

    // attach expires_at if present
    if (tokens.expires_in) tokens.expires_at = Date.now() + tokens.expires_in * 1000;

    // Create a demo userId and persist tokens
    const userId = randomId();
    db.createUser(userId);
    db.saveToken(userId, 'youtube', JSON.stringify(tokens));

    // Clean up state
    oauthStateMap.delete(state);

    // Redirect back to frontend with the new userId (frontend should capture and store for API calls)
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontend}/auth/success?userId=${encodeURIComponent(userId)}&provider=youtube`;
    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Token exchange failed', err?.response?.data || err.message);
    res.status(500).send('Failed to exchange code for token');
  }
});

// Helper to refresh access token if needed
async function ensureAccessToken(userId) {
  const tokens = db.getLatestToken(userId, 'youtube');
  if (!tokens) throw new Error('no_tokens');
  return tokens;
}

// Fetch playlists for a stored userId
app.get('/playlists/youtube', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const tokens = await ensureAccessToken(userId);
    const accessToken = tokens.access_token;
    const { retry } = require('./utils/retry');
    const resp = await retry(() => axios.get('https://www.googleapis.com/youtube/v3/playlists', {
      params: { part: 'snippet,contentDetails', mine: true, maxResults: 50 },
      headers: { Authorization: `Bearer ${accessToken}` }
    }));

    res.json({ playlists: resp.data.items });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    if (err.message === 'no_tokens') return res.status(404).json({ error: 'no_tokens_for_user' });
    res.status(500).json({ error: 'failed_fetch_playlists' });
  }
});

// Spotify OAuth initiation
app.post('/auth/spotify', (req, res) => {
  const state = randomId();
  spotifyStateMap.set(state, { createdAt: Date.now() });
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) return res.status(500).json({ error: 'SPOTIFY config missing' });
  const scope = encodeURIComponent('playlist-modify-private playlist-modify-public user-read-private');
  const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  res.json({ url });
});

// Spotify callback
app.get('/auth/spotify/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || !spotifyStateMap.has(state)) return res.status(400).send('Invalid spotify callback');
  try {
    const tokens = await exchangeCodeForToken(code);
    // get current user's spotify id
    const accessToken = tokens.access_token;
    const me = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    const spotifyUserId = me.data.id;

    const userId = uuidv4();
    // attach expires_at to spotify token info
    if (tokens.expires_in) tokens.expires_at = Date.now() + tokens.expires_in * 1000;
    db.createUser(userId);
    db.saveToken(userId, 'spotify', JSON.stringify({ spotify: tokens, spotifyUserId }));
    spotifyStateMap.delete(state);
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontend}/auth/success?userId=${encodeURIComponent(userId)}&provider=spotify`;
    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Spotify token exchange failed', err?.response?.data || err.message);
    res.status(500).send('Spotify token exchange failed');
  }
});

// Transfer endpoint: YouTube playlist -> Spotify
app.post('/transfer/spotify', async (req, res) => {
  const { sourceUserId, sourcePlaylistId, targetUserId } = req.body; // targetUserId is spotify-linked userId from callback
  if (!sourceUserId || !sourcePlaylistId || !targetUserId) return res.status(400).json({ error: 'sourceUserId, sourcePlaylistId and targetUserId required' });

  // create job record
  const jobId = uuidv4();
  db.createJob({ id: jobId, userId: sourceUserId, sourcePlaylistId, targetPlatform: 'spotify', targetUserId, status: 'pending' });

  // enqueue to Redis Bull queue
  try {
    const Queue = require('bull');
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const transferQueue = new Queue('transfer', redisUrl);
    await transferQueue.add({ jobId });
    res.json({ status: 'queued', jobId });
  } catch (err) {
    console.error('Queue enqueue failed', err.message);
    res.status(500).json({ error: 'enqueue_failed' });
  }
});

// Get transfer status
app.get('/transfer/status/:id', (req, res) => {
  const job = db.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'job_not_found' });
  res.json({ job });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;
