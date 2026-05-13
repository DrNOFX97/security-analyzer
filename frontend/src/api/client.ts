import axios from 'axios';
import type {
  SystemInfo,
  AnalysisResult,
  Alert,
  AnalysisSource,
  TimeBucket,
  AlertType,
  WazuhStatus,
  WazuhConfig,
  WazuhAgent,
  WazuhVulnerability,
  WazuhVulnSummary,
  WazuhSCAPolicy,
  WazuhSCACheck,
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

// Wazuh
export const wazuhAPI = {
  getStatus: () => client.get<WazuhStatus>('/wazuh/status'),

  getConfig: () => client.get<WazuhConfig>('/wazuh/config'),

  saveConfig: (cfg: Partial<WazuhConfig> & { password?: string }) =>
    client.put<{ saved: boolean; url: string }>('/wazuh/config', cfg),

  getAgents: (status?: string) =>
    client.get<{ agents: WazuhAgent[]; total: number }>('/wazuh/agents', { params: { status } }),

  getVulnerabilities: (agentId: string, severity?: string) =>
    client.get<{ vulnerabilities: WazuhVulnerability[]; summary: WazuhVulnSummary; total: number }>(
      `/wazuh/agents/${agentId}/vulnerabilities`,
      { params: { severity } }
    ),

  getCompliance: (agentId: string) =>
    client.get<{ policies: WazuhSCAPolicy[]; total: number }>(`/wazuh/agents/${agentId}/compliance`),

  getComplianceChecks: (agentId: string, policyId: string) =>
    client.get<{ checks: WazuhSCACheck[]; passed: number; failed: number; total: number }>(
      `/wazuh/agents/${agentId}/compliance/${policyId}`
    ),

  triggerActiveResponse: (agentId: string, commandKey: string, args?: string[]) =>
    client.post<{ success: boolean; command: string; agent_id: string }>('/wazuh/active-response', {
      agent_id: agentId,
      command_key: commandKey,
      arguments: args,
    }),

  getAlerts: (limit = 100, level?: number) =>
    client.get<{ alerts: any[]; total: number }>('/wazuh/alerts', { params: { limit, level } }),
};

export default client;
