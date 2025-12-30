Frontend Next.js app (minimal)

Run:

```bash
cd frontend
npm install
npm run dev
```

Environment:
- `NEXT_PUBLIC_API_BASE` — backend base URL (default http://localhost:4000)

Pages:
- `/` — connect YouTube / Spotify
- `/auth/success` — callback landing that saves provider userId to localStorage
- `/playlists` — list YouTube playlists and transfer selected to Spotify
