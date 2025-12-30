# YouTube → Streaming Platform Playlist Sync (MVP)

This repository contains an initial Node.js/Express backend scaffold demonstrating:
- YouTube OAuth (read-only) flow
- Secure token storage demo (AES-256-GCM encrypted, in-memory store for demo)
- Endpoint to list user YouTube playlists

This is an MVP scaffold. Next steps: persist encrypted tokens to a DB, add Spotify OAuth and transfer logic, job queue, frontend.

Quick start

1. Copy `.env.example` to `.env` and fill values.

2. Install dependencies:

```bash
npm install
```

3. Run the server (dev):

```bash
npm run dev
```

4. Initiate YouTube OAuth by calling the endpoint:

```bash
curl -X POST http://localhost:4000/auth/youtube
```

The response will contain an OAuth URL. Open it in browser, complete consent; the callback will show a temporary `userId` string. Use that `userId` to call the playlist endpoint:

```bash
curl "http://localhost:4000/playlists/youtube?userId=THE_USER_ID"
```

Spotify flow (demo)

1. Initiate Spotify OAuth:

```bash
curl -X POST http://localhost:4000/auth/spotify
```

Open the returned `url` in browser and complete consent; the callback will show a `userId` which holds encrypted Spotify tokens.

2. Transfer a playlist from a YouTube-linked user to the Spotify-linked user (demo):

```bash
curl -X POST http://localhost:4000/transfer/spotify \
	-H "Content-Type: application/json" \
	-d '{"sourceUserId":"YOUTUBE_USER_ID","sourcePlaylistId":"PLAYLIST_ID","targetUserId":"SPOTIFY_USER_ID"}'
```

Notes: This demo uses in-memory encrypted stores and a synchronous transfer worker. For production, persist tokens to a DB, use Redis + Bull for background jobs, and secure user authentication.
 
Database & Worker

- This update persists tokens and job records to a SQLite database (see `db.js`).
- Background transfer jobs are processed by `worker.js` using Bull + Redis. Start Redis locally or use a hosted Redis and set `REDIS_URL`.

Run the worker in a separate terminal:

```bash
node worker.js
```

Environment variables required for full flow:

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_REDIRECT_URI
ENCRYPTION_KEY (32 chars)
REDIS_URL
DATABASE_PATH (optional)
```

Notes & Security

- This demo uses in-memory stores; do NOT use in production.
- Store encrypted tokens in a database and use secure session/auth for users.
- Only `https://www.googleapis.com/auth/youtube.readonly` scope is requested.

Roadmap

- Add Spotify OAuth + transfer endpoints
- Persist encrypted tokens to PostgreSQL
- Add Redis + Bull for background transfer jobs
- Add Next.js frontend and real-time progress tracking

# utubeToSpotify
