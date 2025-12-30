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
    <div style={{ padding: 24 }}>
      <h2>Authenticated</h2>
      <p>If you connected an account, it was saved locally for demo use. Go to <a href="/playlists">Playlists</a>.</p>
    </div>
  )
}
