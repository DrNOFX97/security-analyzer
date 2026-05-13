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

// ── Wazuh ────────────────────────────────────────────────────────────────────

export interface WazuhStatus {
  available: boolean;
  url: string;
  host: string;
  port: number;
}

export interface WazuhConfig {
  host: string;
  port: number;
  username: string;
  verify_ssl: boolean;
}

export interface WazuhAgentOS {
  name?: string;
  platform?: string;
  version?: string;
  arch?: string;
}

export interface WazuhAgent {
  id: string;
  name: string;
  ip?: string;
  registerIP?: string;
  status: 'active' | 'disconnected' | 'never_connected' | 'pending';
  os?: WazuhAgentOS;
  version?: string;
  lastKeepAlive?: string;
  manager?: string;
  group?: string[];
}

export interface WazuhVulnerability {
  cve: string;
  name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
  version?: string;
  architecture?: string;
  type?: string;
  published?: string;
  updated?: string;
  cvss3_score?: number;
  cvss2_score?: number;
}

export interface WazuhVulnSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface WazuhSCAPolicy {
  policy_id: string;
  name: string;
  description?: string;
  references?: string;
  pass: number;
  fail: number;
  invalid: number;
  total_checks: number;
  score: number;
  hash_file?: string;
  end_scan?: string;
}

export interface WazuhSCACheck {
  id: number;
  title: string;
  description?: string;
  rationale?: string;
  remediation?: string;
  result: 'passed' | 'failed' | 'not applicable';
  condition?: string;
  rules?: string[];
}
