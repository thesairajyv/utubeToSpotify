const axios = require('axios');
const qs = require('querystring');
const { retry } = require('./retry');
const { normalize, tokenSetScore } = require('./match');

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

async function exchangeCodeForToken(code) {
  const res = await axios.post(SPOTIFY_TOKEN_URL, qs.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return res.data; // access_token, refresh_token, expires_in, scope, token_type
}

async function refreshToken(refresh_token) {
  const res = await axios.post(SPOTIFY_TOKEN_URL, qs.stringify({
    grant_type: 'refresh_token',
    refresh_token,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return res.data;
}

async function searchTrack(accessToken, title, artist) {
  const q = `${title} ${artist}`;
  const res = await retry(() => axios.get(`${SPOTIFY_API_BASE}/search`, {
    params: { q, type: 'track', limit: 10 },
    headers: { Authorization: `Bearer ${accessToken}` }
  }));
  const items = res.data.tracks.items || [];

  const targetTitle = normalize(title || '');
  const targetArtist = normalize(artist || '');

  let best = null;
  let bestScore = 0;
  for (const it of items) {
    const t = normalize(it.name || '');
    const artists = (it.artists || []).map(a => normalize(a.name)).join(' ');
    // compute title and artist overlap
    const titleScore = tokenSetScore(targetTitle, t);
    const artistScore = tokenSetScore(targetArtist, artists);
    const score = Math.max(titleScore * 0.7 + artistScore * 0.3, titleScore, artistScore);
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }

  // if low score, try searching by title only
  if (!best && title) {
    const res2 = await retry(() => axios.get(`${SPOTIFY_API_BASE}/search`, {
      params: { q: title, type: 'track', limit: 10 },
      headers: { Authorization: `Bearer ${accessToken}` }
    }));
    const items2 = res2.data.tracks.items || [];
    if (items2.length) return { track: items2[0], score: 0.2 };
  }

  return best ? { track: best, score: bestScore } : null;
}

async function createPlaylist(accessToken, userId, name, description = '') {
  const res = await retry(() => axios.post(`${SPOTIFY_API_BASE}/users/${encodeURIComponent(userId)}/playlists`, {
    name,
    description,
    public: false
  }, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  }));
  return res.data; // id, external_urls, etc
}

async function addTracks(accessToken, playlistId, uris) {
  // Spotify accepts max 100 URIs per request
  const chunks = [];
  for (let i = 0; i < uris.length; i += 100) chunks.push(uris.slice(i, i + 100));
  for (const chunk of chunks) {
    await retry(() => axios.post(`${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks`, { uris: chunk }, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    }));
  }
}

module.exports = { exchangeCodeForToken, refreshToken, searchTrack, createPlaylist, addTracks };
