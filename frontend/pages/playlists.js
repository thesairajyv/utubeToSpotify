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
    <div style={{ padding: 24 }}>
      <h1>Your YouTube Playlists</h1>
      <p>{status}</p>
      <ul>
        {ytPlaylists.map(pl => (
          <li key={pl.id} style={{ marginBottom: 12 }}>
            <label>
              <input type="checkbox" onChange={() => toggle(pl.id)} /> {' '}
              <strong>{pl.snippet.title}</strong> — {pl.contentDetails.itemCount} items
            </label>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 16 }}>
        <button onClick={transfer}>Transfer Selected to Spotify</button>
      </div>
    </div>
  )
}
