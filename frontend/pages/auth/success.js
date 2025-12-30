import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthSuccess() {
  const router = useRouter();

  useEffect(() => {
    const { userId, provider } = router.query;
    if (userId) {
      // Save to localStorage for demo
      const saved = JSON.parse(localStorage.getItem('utube_sync_users') || '{}');
      saved[provider] = userId;
      localStorage.setItem('utube_sync_users', JSON.stringify(saved));
    }
  }, [router.query]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }}>
      <div className="card slide-up" style={{ maxWidth: 400, padding: 40 }}>
        <div style={{
          width: 60, height: 60, background: '#1DB954', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 30, color: 'white'
        }}>
          ✓
        </div>

        <h2 style={{ marginBottom: 16 }}>Successfully Connected</h2>
        <p style={{ marginBottom: 32 }}>
          Your account has been linked locally. You can now proceed to manage your transfers.
        </p>

        <a href="/playlists" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}>
          Go to Playlists
        </a>

        <div style={{ marginTop: 20 }}>
          <a href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>Back to Home</a>
        </div>
      </div>
    </div>
  )
}
