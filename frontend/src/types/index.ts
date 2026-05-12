export type AlertLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Alert {
  id: string;
  level: AlertLevel;
  level_numeric: 1 | 2 | 3 | 4;
  alert_type: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface AnalysisSummary {
  total_events: number;
  failed_logins: number;
  success_logins: number;
  accounts_created: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  overall_risk: AlertLevel;
}

export interface AnalysisResult {
  ran_at: string;
  source: 'csv' | 'eventlog';
  duration_seconds: number;
  summary: AnalysisSummary;
  alerts: Alert[];
}

export interface SystemInfo {
  hostname: string;
  platform: 'windows' | 'linux' | 'darwin';
  os_version: string;
  os_caption: string;
  owner: string;
  model: string;
  total_ram_gb: number;
  free_ram_mb: number;
  current_user: string;
  domain: string;
  is_admin: boolean;
  wazuh_available: boolean;
  ip_address: string;
  analyzer_version: string;
}

export type AnalysisSource = 'csv' | 'eventlog';

export interface ProgressEvent {
  stage: string;
  channel?: string;
  detector?: string;
  count?: number;
  pct: number;
}

export interface TimeBucket {
  time: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface AlertType {
  alert_type: string;
  count: number;
  max_level: AlertLevel;
}
