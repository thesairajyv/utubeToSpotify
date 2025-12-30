require('dotenv').config();
const Queue = require('bull');
const axios = require('axios');
const db = require('./db');
const { searchTrack, createPlaylist, addTracks } = require('./utils/spotify');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const transferQueue = new Queue('transfer', redisUrl);

transferQueue.process(async (job) => {
  const { jobId } = job.data;
  const j = db.getJob(jobId);
  if (!j) throw new Error('job_not_found');

  try {
    db.setJobStatus(jobId, 'in_progress');

    // fetch youtube tokens for the user and refresh if needed
    const { refreshYoutubeTokenIfNeeded, refreshSpotifyTokenIfNeeded } = require('./utils/oauth-refresh');
    let ytTokens = db.getLatestToken(j.userId, 'youtube');
    if (!ytTokens) throw new Error('no_youtube_tokens');
    ytTokens = await refreshYoutubeTokenIfNeeded(j.userId) || ytTokens;
    const accessToken = ytTokens.access_token;

    // fetch playlist items
    const { retry } = require('./utils/retry');
    const itemsRes = await retry(() => axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: { part: 'snippet,contentDetails', playlistId: j.sourcePlaylistId, maxResults: 50 },
      headers: { Authorization: `Bearer ${accessToken}` }
    }));
    const songs = itemsRes.data.items.map(it => ({ title: it.snippet.title, artist: it.snippet.videoOwnerChannelTitle }));
    db.setJobStatus(jobId, 'in_progress');

    // get spotify tokens for target user and refresh if needed
    let sp = db.getLatestToken(j.targetUserId, 'spotify');
    if (!sp) throw new Error('no_spotify_tokens');
    sp = await refreshSpotifyTokenIfNeeded(j.targetUserId) || sp;
    const spotifyTokens = sp.spotify;
    const spotifyUserId = sp.spotifyUserId;

    // create playlist
    const playlist = await createPlaylist(spotifyTokens.access_token, spotifyUserId, `Imported from YouTube: ${j.sourcePlaylistId}`, 'Imported via utube-to-stream-sync');

    const uris = [];
    const missing = [];
    for (const s of songs) {
      const result = await searchTrack(spotifyTokens.access_token, s.title, s.artist);
      if (result && result.track) {
        uris.push(result.track.uri);
      } else if (result && result.uri) {
        uris.push(result.uri);
      } else {
        missing.push(s);
      }
      db.updateJobProgress(jobId, uris.length);
      // rate limit throttle
      await new Promise(r => setTimeout(r, 150));
    }

    if (uris.length) await addTracks(spotifyTokens.access_token, playlist.id, uris);
    // logging missing tracks (could store to db table)
    if (missing.length) console.log(`Missing ${missing.length} songs for job ${jobId}`);

    db.setJobStatus(jobId, 'completed');
    return { transferred: uris.length, total: songs.length };
  } catch (err) {
    console.error('Worker transfer failed', err?.response?.data || err.message);
    db.setJobStatus(jobId, 'failed', err.message);
    throw err;
  }
});

console.log('Worker started, listening for transfer jobs...');
