import axios from 'axios';
import type {
  SystemInfo,
  AnalysisResult,
  Alert,
  AnalysisSource,
  TimeBucket,
  AlertType,
} from '../types';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// System
export const systemAPI = {
  getInfo: () => client.get<SystemInfo>('/system/info'),
};

// Analysis
export const analysisAPI = {
  run: (data: { source: AnalysisSource; csv_path?: string; hours?: number }) =>
    client.post<{ job_id: string; started_at: string }>('/analysis/run', data),

  stream: (jobId: string) => `${API_BASE}/analysis/stream/${jobId}`,

  getLatest: () => client.get<AnalysisResult>('/analysis/latest'),
};

// Events
export const eventsAPI = {
  getAlerts: (params?: {
    level?: string[];
    type?: string;
    page?: number;
    per_page?: number;
    sort_by?: 'timestamp' | 'level_numeric';
    order?: 'asc' | 'desc';
  }) =>
    client.get<{
      total: number;
      page: number;
      per_page: number;
      items: Alert[];
    }>('/events/alerts', { params }),

  getTimeline: (bucket?: 'hour' | 'day') =>
    client.get<{ buckets: TimeBucket[] }>('/events/summary/timeline', {
      params: { bucket },
    }),

  getTypeSummary: () =>
    client.get<{ types: AlertType[] }>('/events/summary/by-type'),
};

export default client;
