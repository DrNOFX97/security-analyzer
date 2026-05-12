import { useEffect, useState } from 'react';
import { eventsAPI } from '../api/client';
import type { Alert, AlertLevel } from '../types';

interface UseAlertsParams {
  page?: number;
  per_page?: number;
  levels?: AlertLevel[];
  typeQuery?: string;
  sort_by?: 'timestamp' | 'level_numeric';
  order?: 'asc' | 'desc';
}

interface UseAlertsResult {
  alerts: Alert[];
  total: number;
  page: number;
  per_page: number;
  loading: boolean;
  error: string | null;
}

export function useAlerts(params: UseAlertsParams = {}): UseAlertsResult {
  const [data, setData] = useState<{
    alerts: Alert[];
    total: number;
    page: number;
    per_page: number;
  }>({ alerts: [], total: 0, page: 1, per_page: 25 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await eventsAPI.getAlerts({
          page: params.page || 1,
          per_page: params.per_page || 25,
          level: params.levels,
          type: params.typeQuery,
          sort_by: params.sort_by || 'timestamp',
          order: params.order || 'desc',
        });

        setData({
          alerts: response.data.items,
          total: response.data.total,
          page: response.data.page,
          per_page: response.data.per_page,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [params.page, params.per_page, params.levels, params.typeQuery, params.sort_by, params.order]);

  return {
    alerts: data.alerts,
    total: data.total,
    page: data.page,
    per_page: data.per_page,
    loading,
    error,
  };
}
