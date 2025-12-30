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

  /* New Modern Home Component */
  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

      {/* Abstract Background Blurs */}
      <div style={{ position: 'absolute', top: -100, left: -100, width: 500, height: 500, background: '#ff0000', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: -100, right: -100, width: 600, height: 600, background: '#1DB954', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }} />

      <main className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 800 }}>

        <div className="slide-up">
          <span style={{
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#888',
            marginBottom: 24,
            display: 'block'
          }}>
            Playlist Migration Tool
          </span>

          <h1 style={{ marginBottom: 24 }}>
            Sync your music from <br />
            <span style={{
              background: 'linear-gradient(to right, #ff4444, #1DB954)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>YouTube to Spotify</span>
          </h1>

          <p style={{ maxWidth: 500, margin: '0 auto 40px', fontSize: '1.25rem' }}>
            Effortlessly transfer your favorite video playlists to your streaming library in seconds. No more manual searching.
          </p>

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={connectYouTube}
              disabled={loading}
              className="btn btn-youtube"
              style={{ minWidth: 200, justifyContent: 'center' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              Connect YouTube
            </button>
            <button
              onClick={connectSpotify}
              disabled={loading}
              className="btn btn-spotify"
              style={{ minWidth: 200, justifyContent: 'center' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
              Connect Spotify
            </button>
          </div>

          <div style={{ marginTop: 60, display: 'inline-block', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: 20, backdropFilter: 'blur(10px)' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>✨ <strong>Tip:</strong> Log in to both to start transferring.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
