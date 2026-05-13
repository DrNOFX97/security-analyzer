import { useEffect, useState, useMemo } from 'react';
import { eventsAPI } from '../api/client';
import { useAnalysisStore } from '../store/analysisStore';
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
  const isDemoMode = useAnalysisStore((s) => s.isDemoMode);
  const storeAlerts = useAnalysisStore((s) => s.result?.alerts ?? []);

  const demoResult = useMemo(() => {
    if (!isDemoMode) return null;

    const { page = 1, per_page = 25, levels, typeQuery, sort_by = 'timestamp', order = 'desc' } = params;
    let filtered = [...storeAlerts];

    if (levels && levels.length > 0) {
      filtered = filtered.filter((a) => levels.includes(a.level));
    }
    if (typeQuery) {
      filtered = filtered.filter((a) => a.alert_type.toLowerCase().includes(typeQuery.toLowerCase()));
    }

    filtered.sort((a, b) => {
      if (sort_by === 'level_numeric') {
        return order === 'desc' ? b.level_numeric - a.level_numeric : a.level_numeric - b.level_numeric;
      }
      const cmp = a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
      return order === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const start = (page - 1) * per_page;
    return { alerts: filtered.slice(start, start + per_page), total, page, per_page };
  }, [isDemoMode, storeAlerts, params.page, params.per_page, params.levels, params.typeQuery, params.sort_by, params.order]);

  const [data, setData] = useState<{ alerts: Alert[]; total: number; page: number; per_page: number }>(
    { alerts: [], total: 0, page: 1, per_page: 25 }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) return;

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
  }, [isDemoMode, params.page, params.per_page, params.levels, params.typeQuery, params.sort_by, params.order]);

  if (isDemoMode && demoResult) {
    return { ...demoResult, loading: false, error: null };
  }

  return { alerts: data.alerts, total: data.total, page: data.page, per_page: data.per_page, loading, error };
}
