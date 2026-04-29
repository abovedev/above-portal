import { useEffect, useState } from 'react';
import api from '@/lib/api';

export async function connectGoogle() {
  const res = await api.get('/google/auth');
  window.location.href = res.data.data.url;
}

export async function reconnectGoogle() {
  const res = await api.post('/google/reconnect');
  window.location.href = res.data.data.url;
}

interface GoogleStatus {
  connected: boolean;
  email: string | null;
}

export function useGoogleStatus() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = () => {
    setLoading(true);
    api.get('/google/status')
      .then((res) => setStatus(res.data.data))
      .catch(() => setStatus({ connected: false, email: null }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refetch(); }, []);

  return { status, loading, refetch };
}
