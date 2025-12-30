import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function connectYouTube() {
    setLoading(true);
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/auth/youtube`);
    window.location.href = res.data.url;
  }

  async function connectSpotify() {
    setLoading(true);
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/auth/spotify`);
    window.location.href = res.data.url;
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>YouTube → Streaming Sync (MVP)</h1>
      <p>Connect your accounts (demo)</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={connectYouTube} disabled={loading}>Connect YouTube</button>
        <button onClick={connectSpotify} disabled={loading}>Connect Spotify</button>
      </div>
      <p style={{ marginTop: 20 }}>
        After completing OAuth, you'll be redirected here with a `userId` which you should save for API calls. Then go to <a href="/playlists">Playlists</a> to fetch YouTube playlists and transfer.
      </p>
    </div>
  )
}
