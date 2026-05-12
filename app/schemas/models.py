from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime


AlertLevelStr = Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']


class IOCModel(BaseModel):
    ips: List[str] = []
    accounts: List[str] = []
    commands: List[str] = []
    domains: List[str] = []
    hashes: List[str] = []
    registry_keys: List[str] = []
    file_paths: List[str] = []


class AlertModel(BaseModel):
    id: str
    level: AlertLevelStr
    level_numeric: int
    alert_type: str
    details: Dict[str, Any]
    timestamp: str
    threat_score: Optional[int] = None
    severity_level: Optional[str] = None
    iocs: Optional[IOCModel] = None
    context: Optional[str] = None
    remediation: Optional[List[str]] = None


class SummaryModel(BaseModel):
    total_events: int
    failed_logins: int
    success_logins: int
    accounts_created: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    overall_risk: AlertLevelStr


class AnalysisResultModel(BaseModel):
    ran_at: str
    source: Literal['csv', 'eventlog']
    duration_seconds: float
    summary: SummaryModel
    alerts: List[AlertModel]


class AnalysisRunRequest(BaseModel):
    source: Literal['csv', 'eventlog']
    csv_path: Optional[str] = 'logs.csv'
    hours: Optional[int] = 24


class AnalysisRunResponse(BaseModel):
    job_id: str
    started_at: str


class ProgressEvent(BaseModel):
    stage: str
    channel: Optional[str] = None
    detector: Optional[str] = None
    count: Optional[int] = None
    pct: int


class SystemInfoModel(BaseModel):
    hostname: str
    platform: Literal['windows', 'linux', 'darwin']
    os_version: str
    os_caption: str = 'Desconhecido'
    owner: str = 'Desconhecido'
    model: str = 'Desconhecido'
    total_ram_gb: float = 0
    free_ram_mb: float = 0
    current_user: str
    domain: str
    is_admin: bool
    wazuh_available: bool
    ip_address: str
    analyzer_version: str = '2.0'


class TimelineBucketModel(BaseModel):
    time: str
    critical: int
    high: int
    medium: int
    low: int
    total: int


class TimelineModel(BaseModel):
    buckets: List[TimelineBucketModel]


class AlertTypeModel(BaseModel):
    alert_type: str
    count: int
    max_level: AlertLevelStr


class TypeSummaryModel(BaseModel):
    types: List[AlertTypeModel]


class AlertsPageModel(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[AlertModel]
