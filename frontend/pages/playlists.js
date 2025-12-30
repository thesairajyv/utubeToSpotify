import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Playlists() {
  const [ytPlaylists, setYtPlaylists] = useState([]);
  const [selected, setSelected] = useState({});
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // try to load youtube userId from localStorage
    const saved = JSON.parse(localStorage.getItem('utube_sync_users') || '{}');
    if (saved.youtube) fetchPlaylists(saved.youtube);
  }, []);

  async function fetchPlaylists(userId) {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/playlists/youtube?userId=${encodeURIComponent(userId)}`);
      setYtPlaylists(res.data.playlists || []);
    } catch (err) {
      setStatus('failed_fetch');
    }
  }

  function toggle(id) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function transfer() {
    const saved = JSON.parse(localStorage.getItem('utube_sync_users') || '{}');
    if (!saved.youtube || !saved.spotify) return setStatus('missing_linked_accounts');
    const playlistIds = Object.keys(selected).filter(k => selected[k]);
    if (!playlistIds.length) return setStatus('no_playlists_selected');

    // enqueue transfers for each selected playlist
    for (const pid of playlistIds) {
      const resp = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'}/transfer/spotify`, {
        sourceUserId: saved.youtube,
        sourcePlaylistId: pid,
        targetUserId: saved.spotify
      });
      console.log('enqueued', resp.data);
    }
    setStatus('queued');
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <header className="slide-up" style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: 8 }}>Select Playlists</h1>
          <p>Choose what you want to move to Spotify.</p>
        </div>
        <div>
          <button
            onClick={transfer}
            className="btn btn-primary"
            style={{ padding: '16px 32px', fontSize: '1.1rem' }}
            disabled={status === 'queued'}
          >
            {status === 'queued' ? 'Transferring...' : 'Start Transfer →'}
          </button>
        </div>
      </header>

      {status && status !== 'queued' && (
        <div className="fade-in" style={{ padding: 16, background: 'rgba(255,0,0,0.1)', color: '#ff4444', borderRadius: 8, marginBottom: 24 }}>
          Status: {status}
        </div>
      )}

      {ytPlaylists.length === 0 ? (
        <div className="slide-up delay-100" style={{ textAlign: 'center', padding: 80, background: 'var(--bg-secondary)', borderRadius: 16 }}>
          <p>No playlists found or not connected.</p>
          <a href="/" style={{ color: 'var(--accent-spotify)', textDecoration: 'none' }}>Go back to Connect</a>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24
        }}>
          {ytPlaylists.map((pl, i) => (
            <div
              key={pl.id}
              className={`card slide-up`}
              style={{
                animationDelay: `${i * 50}ms`,
                cursor: 'pointer',
                border: selected[pl.id] ? '1px solid var(--accent-spotify)' : '1px solid var(--glass-border)',
                background: selected[pl.id] ? 'rgba(29, 185, 84, 0.05)' : 'var(--bg-secondary)',
                position: 'relative'
              }}
              onClick={() => toggle(pl.id)}
            >
              <div style={{ position: 'absolute', top: 16, right: 16 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '2px solid ' + (selected[pl.id] ? '#1DB954' : '#555'),
                  background: selected[pl.id] ? '#1DB954' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {selected[pl.id] && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                </div>
              </div>

              {pl.snippet.thumbnails?.medium && (
                <img
                  src={pl.snippet.thumbnails.medium.url}
                  alt={pl.snippet.title}
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
                />
              )}

              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pl.snippet.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {pl.contentDetails.itemCount} tracks
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
