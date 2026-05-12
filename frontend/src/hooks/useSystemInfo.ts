import { useEffect, useState } from 'react';
import { systemAPI } from '../api/client';
import type { SystemInfo } from '../types';

export function useSystemInfo() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const response = await systemAPI.getInfo();
        setInfo(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch system info');
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, []);

  return { info, loading, error };
}
