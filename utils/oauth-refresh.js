const axios = require('axios');
const db = require('../db');
const { refreshToken: spotifyRefreshToken } = require('./spotify');

async function refreshYoutubeTokenIfNeeded(userId) {
  const tok = db.getLatestToken(userId, 'youtube');
  if (!tok) return null;
  const now = Date.now();
  if (tok.expires_at && tok.expires_at > now + 60000) return tok; // still valid

  if (!tok.refresh_token) throw new Error('no_youtube_refresh_token');

  const res = await axios.post('https://oauth2.googleapis.com/token', null, {
    params: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: tok.refresh_token,
      grant_type: 'refresh_token'
    },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const newTok = Object.assign({}, tok, res.data);
  if (res.data.expires_in) newTok.expires_at = Date.now() + res.data.expires_in * 1000;
  db.saveToken(userId, 'youtube', JSON.stringify(newTok));
  return newTok;
}

async function refreshSpotifyTokenIfNeeded(userId) {
  const tokRow = db.getLatestToken(userId, 'spotify');
  if (!tokRow) return null;
  const tok = tokRow; // shape: { spotify: { access_token, refresh_token, expires_in }, spotifyUserId }
  const now = Date.now();
  if (tok.spotify && tok.spotify.expires_at && tok.spotify.expires_at > now + 60000) return tok;

  if (!tok.spotify || !tok.spotify.refresh_token) throw new Error('no_spotify_refresh_token');

  const refreshed = await spotifyRefreshToken(tok.spotify.refresh_token);
  // merge
  const merged = Object.assign({}, tok, { spotify: Object.assign({}, tok.spotify, refreshed) });
  if (refreshed.expires_in) merged.spotify.expires_at = Date.now() + refreshed.expires_in * 1000;
  db.saveToken(userId, 'spotify', JSON.stringify(merged));
  return merged;
}

module.exports = { refreshYoutubeTokenIfNeeded, refreshSpotifyTokenIfNeeded };
