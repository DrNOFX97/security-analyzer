# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ IMPORTANT: Commit Guidelines

**NUNCA CO-AUTHORAR CLAUDE** - Do not add "Co-Authored-By: Claude" or any AI attribution to commits. Commits are authored solely by the human user.

## Overview

**Windows Security Log Analyzer v2.0** - A professional security analysis tool that reads real Windows Event Logs and performs advanced threat detection with SIEM best practices. The analyzer uses IOC (Indicators of Compromise) extraction, threat scoring, event correlation, and contextual threat intelligence to detect brute force attacks, account takeovers, suspicious services, malicious PowerShell scripts, and multi-event attack patterns.

## Common Commands

### Installation
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install
```

### Running the CLI Analyzer (Legacy)

```bash
# As Administrator (recommended - reads real Event Logs)
run_admin.bat
# OR
python security_analyzer.py

# With test data (CSV fallback, no Admin required)
python security_analyzer.py --input logs.csv

# Custom timeframe
python security_analyzer.py --hours 168  # Last 7 days
```

### Running the Web Dashboard

```bash
# Terminal 1: Start FastAPI backend (Windows Event Log reading requires Admin)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend dev server
cd frontend && npm run dev
# Opens http://localhost:5173
```

### Building for Production

```bash
# Build frontend
cd frontend && npm run build
# Output: frontend/dist/ (served by FastAPI)

# Run production backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# Open http://localhost:8000
```

### Dashboard Output
- Web-based dashboard at `http://localhost:8000` (or `http://localhost:5173` during dev)
- Real-time analysis progress via Server-Sent Events (SSE)
- Interactive charts: severity timeline, alert distribution
- Filterable alerts table with pagination
- System information display: hostname, IP, user, domain, admin status
- Reports still generated in `./reports/` on CSV analysis

## Architecture

### Web Dashboard (FastAPI + React)

The dashboard wraps the security analyzer in a modern, real-time web interface:

```
┌─────────────────────────────────────────────────────────────┐
│ React Frontend (http://localhost:5173 dev / :8000 prod)    │
│ - Pages: Dashboard, Alerts, Settings                        │
│ - Components: KPI cards, Recharts (timeline, distribution)  │
│ - State: Zustand (result, progress, filters)                │
│ - TypeScript: Full type safety with frontend/src/types/     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                 API Contracts
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ FastAPI Backend (http://localhost:8000)                     │
│ - GET /api/system/info → SystemInfo (hostname, IP, admin)   │
│ - POST /api/analysis/run → start analysis job                │
│ - GET /api/analysis/stream/{id} → SSE progress stream       │
│ - GET /api/analysis/latest → cached AnalysisResult          │
│ - GET /api/events → paginated, filtered alerts              │
│ - GET /api/events/summary/timeline → time-bucketed counts   │
│ - GET /api/events/summary/by-type → alert type distribution │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (Adapts to)
┌──────────────────────▼──────────────────────────────────────┐
│ AnalyzerService (app/services/analyzer_service.py)          │
│ - Cross-platform wrapper: guards ctypes.windll (Windows)    │
│ - Reuses: SecurityAnalyzer, WindowsLogReader, events/alerts │
│ - Admin check: _is_admin() → disables eventlog if not admin │
│ - IP detection: _get_local_ip() → socket.connect(8.8.8.8)   │
│ - Job queue: _jobs dict for async analysis tracking         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                 (Delegates to)
                       │
         ┌─────────────┴──────────────┐
         │                            │
         ▼                            ▼
    CSV File              Windows Event Log
    (no Admin)            (Admin required)
```

**Key Design Details:**
- **Async non-blocking**: `asyncio.run_in_executor()` prevents FastAPI event loop blocking during PowerShell calls
- **Real-time streaming**: SSE (Server-Sent Events) streams progress: reading → analyzing → complete
- **Admin enforcement**: Frontend disables Event Log option if not admin; backend rejects if attempt made
- **Stateless results**: Latest result cached in-memory (loses on restart); supports pagination/filtering on-demand
- **Type safety**: Pydantic models (backend) ↔ TypeScript interfaces (frontend)

### CLI Analyzer Core Design Pattern: Modular Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ [1] EnvironmentInfo                                         │
│     - Detect OS, hostname, user, domain, admin status       │
│     - Print system banner for context                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ [2] PermissionChecker                                       │
│     - Verify Admin privileges (ctypes.windll)               │
│     - Test access to each log channel                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ [3] WindowsLogReader                                        │
│     - Execute PowerShell Get-WinEvent commands              │
│     - Parse JSON output into Event objects                  │
│     - Read from 4 channels: Security, System, Application,  │
│       PowerShell/Operational (last 24h by default)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ [4] SecurityAnalyzer                                        │
│     - Run all detection methods:                            │
│       • detect_brute_force() → Event 4625                   │
│       • detect_account_takeover() → 4625→4624 chain         │
│       • detect_account_changes() → Events 4720, 4724, 4728  │
│       • detect_suspicious_services() → Event 7045           │
│       • detect_powershell_anomalies() → Event 4104          │
│     - Accumulate alerts with severity levels                │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ [5] Report                                                  │
│     - generate_console_report() → colored terminal output   │
│     - export_csv() → structured alert data                  │
│     - export_txt() → human-readable report                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ [6] WazuhIntegration (NEW)                                  │
│     - Send alerts to Wazuh Manager (TCP port 1514)          │
│     - Format alerts as Wazuh events (JSON)                  │
│     - Fallback: write to wazuh_events.jsonl if unavailable  │
└─────────────────────────────────────────────────────────────┘
```

### Backend API & Data Models

**Pydantic Models** (`app/schemas/models.py`):
- `IOCModel`: Extracted indicators of compromise (ips, accounts, commands, domains, hashes, registry_keys, file_paths)
- `AlertModel`: Enriched alert with id, level, level_numeric, alert_type, details, timestamp, plus threat intelligence fields:
  - `threat_score` (0-100): Overall threat level
  - `severity_level` (str): CRITICAL/HIGH/MEDIUM/LOW
  - `iocs` (IOCModel): Extracted indicators
  - `context` (str): Detailed PT-PT threat explanation
  - `remediation` (List[str]): Remediation steps
- `SummaryModel`: Event counts, login stats, alert counts by level, overall_risk
- `AnalysisResultModel`: Wrapped result with ran_at, source, duration_seconds, summary, alerts (with enriched AlertModel)
- `SystemInfoModel`: Hostname, platform, os_version, current_user, domain, is_admin, wazuh_available, ip_address, analyzer_version
- `ProgressEvent`: Stream updates during analysis (stage, channel, detector, count, pct)
- `TimelineBucketModel`: Alerts grouped by hour/day (time, critical/high/medium/low counts, total)
- `AlertTypeModel`: Alert distribution by type (alert_type, count, max_level)

**API Routers** (`app/routers/`):
- `system.py`: `GET /api/system/info` → SystemInfoModel
- `analysis.py`: 
  - `POST /api/analysis/run` → {"job_id", "started_at"}
  - `GET /api/analysis/stream/{job_id}` → SSE with progress events
  - `GET /api/analysis/latest` → AnalysisResultModel or null
- `events.py`:
  - `GET /api/events?level=CRITICAL&type=Brute&page=1&per_page=25` → AlertsPageModel
  - `GET /api/events/summary/timeline?bucket=hour` → TimelineModel
  - `GET /api/events/summary/by-type` → TypeSummaryModel

**AnalyzerService** (`app/services/analyzer_service.py`):
- `get_system_info()` → Dict with platform detection, admin check, IP detection
- `run_analysis_sync()` → AnalysisResultModel (called via run_in_executor)
- `get_alerts()` → paginated/filtered alert list with sorting
- `get_timeline()` → time-bucketed alert counts
- `get_type_summary()` → alert distribution by type

### Frontend Components & State

**Zustand Store** (`frontend/src/store/analysisStore.ts`):
- `result`: Latest AnalysisResultModel or null
- `isRunning`: Boolean (analysis in progress)
- `progress`: ProgressEvent array (streamed from SSE)
- `error`: String or null (analysis failure message)
- `filters`: {levels: string[], typeQuery: string} (alert filtering)

**Custom Hooks** (`frontend/src/hooks/`):
- `useSystemInfo()`: Fetches system info on mount, caches in useState
- `useAnalysis()`: Manages EventSource SSE connection, parses progress/complete/error events
- `useAlerts()`: Fetches paginated alerts with filter/sort dependencies

**Pages** (`frontend/src/pages/`):
- `DashboardPage`: KPI grid + timeline chart + severity breakdown
- `AlertsPage`: Filter bar + alerts table with expandable details
- `SettingsPage`: System info grid (hostname, OS, IP, domain, user, admin, Wazuh status)

**Components** (`frontend/src/components/`):
- Layout: Sidebar (nav), TopBar (system info header), Layout (main structure)
- Shared: SeverityBadge (colored level), StatusBanner (admin warning), Spinner, EmptyState
- Dashboard: KpiCard, KpiGrid, AlertsTimeline (Recharts AreaChart), SeverityBreakdown (BarChart)
- Alerts: FilterBar (severity + type search), AlertsTable (sortable, paginated, expandable rows)
- Analysis: RunAnalysisPanel (source selector, run button), ProgressStream (SSE display)

### CLI Analyzer Key Classes & Responsibilities

**EnvironmentInfo** (`security_analyzer.py:71-95`)
- Static methods for system introspection (hostname, OS, user, domain)
- Uses `ctypes.windll.shell32.IsUserAnAdmin()` to detect elevation status
- `print_banner()` displays system context before analysis

**PermissionChecker** (`security_analyzer.py:98-131`)
- `check_admin()` - Requires Administrator; fails gracefully with instructions
- `check_log_access()` - Tests PowerShell connectivity to each log channel; returns dict of accessible logs

**WindowsLogReader** (`security_analyzer.py:134-200`)
- Core PowerShell integration: `subprocess.run(['powershell', '-Command', ...], ...)`
- Reads via `Get-WinEvent -FilterHashtable` with JSON output
- Dynamically parses JSON (handles both single object and arrays)
- **Important:** All log reading is asynchronous via subprocess; failures are caught and reported per-channel

**Event** (`security_analyzer.py`)
- Data class: event_id, timestamp, account, source_ip, message, log_channel
- Uses `LogParser.parse_log_line()` to extract additional fields (severity, process, action, user, port, etc.)
- Timestamp parsing: `datetime.strptime(item.get('TimeCreated'), '%Y-%m-%d %H:%M:%S')`
- Result: `.parsed` dict with standardized fields for correlation

**SecurityAnalyzer** (`security_analyzer.py`)
- Takes list of Event objects with enriched fields
- Each `detect_*()` method:
  - Filters events by event_id
  - Creates Alert objects with full event_message parameter
  - Passes `details` dict with frequency and event_id for threat scoring
- `analyze_event_correlation()` - New method that:
  - Groups events by source IP using LogParser.correlate_events()
  - Detects multi-event attack patterns (brute force sequences, privilege escalation, port scanning)
  - Creates alerts for detected patterns with correlation details
- Thresholds configured in CONFIG dict (BRUTE_FORCE_THRESHOLD=5, QUICK_BREACH_TIME_SECONDS=300)
- `get_summary()` aggregates metrics for reporting

**Alert** (`security_analyzer.py`)
- Enriched with IOC extraction and threat scoring via ThreatIntelligence:
  - `threat_score` (0-100): Calculated from alert type + IOC count + event frequency
  - `severity_level` (CRITICAL/HIGH/MEDIUM/LOW): Determined from threat score
  - `iocs`: Extracted IPs, domains, file paths, registry keys, hashes, accounts, commands
  - `threat_context`: Detailed PT-PT threat explanation (user-facing)
  - `remediation_steps`: SIEM-recommended remediation actions
- Stores: level, alert_type, details, timestamp, event_message, and all enriched fields
- `to_dict()` returns CSV-compatible dict with all enriched data

**Report** (`security_analyzer.py:360-431`)
- Consumes SecurityAnalyzer instance
- Three export methods: console (colorized), CSV (pandas), TXT (plain text)
- Output dir auto-created; filenames include timestamp for uniqueness

**WazuhIntegration** (`wazuh_integration.py`)
- TCP client for Wazuh Manager (default: `127.0.0.1:1514`)
- `connect()` - Establishes connection; returns False if unavailable
- `send_alert()` / `send_alerts_batch()` - Sends alerts; automatically falls back to local file on failure
- `_format_wazuh_event()` - Converts Alert objects to Wazuh JSON format
- `_log_local()` - Appends to `wazuh_events.jsonl` (JSON Lines) as fallback
- Handles both dict and Alert object types (polymorphic)

### Threat Intelligence Pipeline

**ThreatIntelligence** (`threat_intelligence.py`)
- IOC extraction: `extract_iocs(message, event_id)` - Regex patterns for IPs, domains, file paths, registry keys, hashes
- Threat scoring: `calculate_threat_score(alert_type, ioc_count, event_frequency)` - Returns (score: 0-100, severity: CRITICAL/HIGH/MEDIUM/LOW)
  - Base score by alert type (Brute Force: 70, Account Takeover: 95, etc.)
  - IOC bonus: +5 per IOC (capped at +20)
  - Frequency bonus: +2 per event (capped at +15)
- Threat context: `generate_threat_context(alert_type, details)` - PT-PT explanations for each attack type
- Remediation: `get_remediation_steps(alert_type)` - SIEM-recommended actions (numbered lists)
- Severity mapping: 85+ CRITICAL, 70-84 HIGH, 50-69 MEDIUM, <50 LOW

**LogParser** (`log_parser.py`)
- Field extraction: `parse_log_line(line)` - Extracts timestamp, hostname, severity, process, source_ip, dest_ip, port, action, user, status
- Event correlation: `correlate_events(events)` - Groups by source IP, detects events within 5-min windows
- Attack pattern detection: `detect_attack_pattern(events)` - Identifies brute force, privilege escalation, port scanning, data exfiltration
- Timeline generation: `create_timeline(events)` - Human-readable PT-PT timeline with emojis and severity
- IOC summarization: `summarize_iocs_by_field(events)` - Pivot table of IOCs grouped by type

**Integration Flow:**
1. `Event` objects created from raw log messages → `LogParser.parse_log_line()` extracts fields into `.parsed` dict
2. `SecurityAnalyzer.detect_*()` methods create `Alert` objects, passing full `event_message` parameter
3. `Alert.__init__()` calls:
   - `ThreatIntelligence.extract_iocs()` to populate IOCs
   - `ThreatIntelligence.calculate_threat_score()` to get threat score + severity
   - `ThreatIntelligence.generate_threat_context()` for detailed PT-PT explanation
   - `ThreatIntelligence.get_remediation_steps()` for SIEM actions
4. `SecurityAnalyzer.analyze_event_correlation()` uses `LogParser.correlate_events()` to detect multi-event patterns
5. All enriched Alert data returned via API to frontend for display

### Event ID Reference

**CONFIG['EVENT_IDS']** dictionary maps EventID → description per channel:

| Channel | Key Event IDs | Analysis |
|---------|---------------|----------|
| Security | 4625 (failed), 4624 (success), 4720 (user created), 4728 (group change) | Brute force, takeover, account creation |
| System | 7045 (service installed), 6005/6006 (startup/shutdown) | Suspicious service installation |
| Application | 1000/1001 (crash/error reporting) | System stability |
| PowerShell | 4104 (script block), 4103 (module logging) | Malicious scripts (keyword detection) |

## Threat Intelligence Features

### Understanding Threat Scoring

Threat score (0-100) combines three factors:
1. **Base severity** - Alert type determines baseline (Account Takeover: 95, Brute Force: 70, etc.)
2. **IOC count** - Each extracted IOC adds +5 (capped at +20)
3. **Event frequency** - Each correlated event adds +2 (capped at +15)

Example: Brute force attack with 3 source IPs + 4 failed attempts:
- Base: 70 (brute force)
- IOCs: 3 IPs × 5 = +15 (capped, so +15)
- Frequency: 4 events × 2 = +8 (capped at +15 but only +8 used)
- Final: 70 + 15 + 8 = 93 (HIGH)

### Customizing IOC Extraction

To add new IOC patterns, modify `ThreatIntelligence.extract_iocs()`:
```python
# Example: Extract process names from messages
process_pattern = r'Process:\s*([^\s]+)'
iocs['processes'] = re.findall(process_pattern, message, re.IGNORECASE)
```

### Customizing Threat Context

Update the `contexts` dict in `ThreatIntelligence.generate_threat_context()`:
```python
'New Alert Type': (
    f"Detailed explanation in PT-PT:\n"
    f"- Key detail 1: {details.get('field', 'N/A')}\n"
    f"- Key detail 2: {details.get('other_field', 'N/A')}"
)
```

### Customizing Remediation Steps

Update the `steps` dict in `ThreatIntelligence.get_remediation_steps()`:
```python
'New Alert Type': [
    '1. First step',
    '2. Second step',
    '3. Third step'
]
```

### Event Correlation Thresholds

`LogParser.correlate_events()` groups events by source IP within 5-minute windows. To adjust:
```python
# In log_parser.py, find the 5-minute window definition:
time_diff = (event.timestamp - first_event.timestamp).total_seconds()
if time_diff < 300:  # ← Change 300 to different seconds
```

## Adding New Detections

### 1. Add EventID to CONFIG
```python
EVENT_IDS = {
    'Security': {
        4627: 'New Event Type',  # ← Add here
    }
}
```

### 2. Add Detection Method to SecurityAnalyzer
```python
def detect_new_threat(self):
    """Detect [threat type]"""
    for event in self.events:
        if event.event_id == 4627:
            alert = Alert(
                level=AlertLevel.HIGH,
                alert_type='New Threat Type',
                details={
                    'event_id': event.event_id,
                    'frequency': 1,  # ← Required for threat scoring
                    # ... other details
                },
                event_message=event.message  # ← CRITICAL: Pass message for IOC extraction
            )
            self.alerts.append(alert)
```

**Key pattern:** Always pass `event_message=event.message` to Alert constructor. This enables:
- IOC extraction from the raw message
- Threat score calculation based on IOCs found
- Threat context generation specific to this attack type
- Remediation step recommendations

### 3. Call from analyze_all()
```python
def analyze_all(self):
    self.detect_brute_force()
    self.detect_account_takeover()
    # ...
    self.detect_new_threat()  # ← Add call before analyze_event_correlation()
    self.analyze_event_correlation()  # ← Must be last to correlate all alerts
```

### Detection Examples

- **Brute Force**: Count failed logins per IP; alert if >= BRUTE_FORCE_THRESHOLD
  - Details: `source_ip`, `target_account`, `failed_attempts`, `frequency` (attempt count)
  - Example IOCs: Source IP extracted from message
- **Account Takeover**: Find 4625→4624 sequence within QUICK_BREACH_TIME_SECONDS
  - Details: `account`, `time_to_breach_seconds`, `frequency: 2` (failed + success pair)
  - Example IOCs: Account name extracted, both failed and success messages processed
- **Suspicious Names**: Check event.message against SUSPICIOUS_USERNAMES list
  - Details: `username`, `suspicious_name` (bool), `frequency: 1`
  - Example IOCs: Username and any paths/processes in creation message
- **PowerShell Malware**: Scan event.message for keywords like "DownloadString", "IEX", "Bypass"
  - Details: Partial message excerpt, `frequency: 1`
  - Example IOCs: URLs, file paths, and command names extracted from script block

## Extending Wazuh Integration

### Custom Alert Formatters

Alerts sent to Wazuh use `WazuhIntegration._format_wazuh_event()`. Customize the JSON structure:

```python
def _format_wazuh_event(self, alert):
    # Modify before sending
    event = {...}
    event['custom_field'] = 'value'
    return event
```

### Batch Operations

For high-volume alerts, use `send_alerts_batch()`:

```python
wazuh = WazuhIntegration()
wazuh.connect()
stats = wazuh.send_alerts_batch(analyzer.alerts)  # Returns {sent, failed, local}
```

### Offline Mode

Events accumulate in `wazuh_events.jsonl` (JSONL format) if Manager unavailable. Later sync:

```python
# Manually replay from JSONL:
for line in open('wazuh_events.jsonl'):
    event = json.loads(line)
    wazuh.send_alert(event)
```

### Adding Wazuh Agent Rules

Place custom rules in Wazuh Manager's `ruleset/rules/` directory. Map to analyzer alerts via decoder:

## Important Constraints

### Windows-Only Design
- Relies on `ctypes.windll` (Windows API) for Admin check
- PowerShell required for log reading (subprocess calls `powershell.exe`)
- Event Log timestamps are Windows-specific
- **Does not run on Linux/macOS without major refactoring**

### Admin Requirement
- Reading Security Event Log requires Administrator privileges
- Script checks and fails gracefully; provides elevation instructions
- `run_admin.bat` provided for convenience; alternatively `run_admin.ps1`

### UTF-8 Encoding
- Windows console defaults to cp1252; script forces UTF-8 at startup:
  ```python
  if sys.platform == 'win32':
      os.environ['PYTHONIOENCODING'] = 'utf-8'
      sys.stdout.reconfigure(encoding='utf-8')
  ```
- Critical for colored output (colorama) and emoji in terminal

### Subprocess Timeout
- PowerShell commands timeout after 30s (see `WindowsLogReader._read_log()`)
- Large log channels (e.g., Security) can approach this; increase if needed

## Data Flow & State Management

1. **No persistent state**: Each run is independent; no caching of logs
2. **Events are immutable**: Once created, Event objects are not modified
3. **Alerts accumulate**: `analyzer.alerts` list grows during analysis; no deduplication
4. **Reports are ephemeral**: Generated on-the-fly from analyzer state

## Testing & Validation

### With Real Event Logs
```bash
# Requires Admin
python security_analyzer.py
# Check ./reports/ for output
```

### With Test Data
```bash
python security_analyzer.py --input logs.csv
# Uses data/sample_logs.csv by default
```

### Manual Verification
```powershell
# Verify log access manually
Get-WinEvent -LogName Security -MaxEvents 5
Get-WinEvent -LogName System -MaxEvents 5
```

## Wazuh Integration

Alerts are automatically sent to Wazuh Manager (or logged locally as JSONL fallback). See `WAZUH_INTEGRATION.md` for detailed setup.

**Key Points:**
- Requires Wazuh Agent installed (via MSI): `C:\Program Files (x86)\ossec-agent\`
- Configure manager address in `ossec.conf` (default: `127.0.0.1:1514`)
- Fallback: if Manager unavailable, events written to `wazuh_events.jsonl` (can be manually synced later)
- No failures: analyzer completes even if Wazuh connection fails

## Known Limitations & Future Work

- **Event correlation window fixed at 5 minutes**: Could make configurable for different attack detection scenarios
- **No filtering by user/IP**: Analyzer processes all events; could optimize with `Get-WinEvent -FilterHashtable`
- **No email/webhook alerts**: Reports only saved to disk (Wazuh integration handles SIEM forwarding)
- **No persistence**: Logs not archived; each run is independent
- **EventID mapping is static**: Could be externalized to JSON config for easier updates
- **Single-machine analysis**: Does not aggregate from multiple systems (SIEM-style)
- **Threat score weights hardcoded**: Could be externalized to config file for tuning by security team
- **Wazuh enrollment**: Currently manual; could auto-enroll agents
- **IOC deduplication**: Multiple alerts from same attacker IP not consolidated; could implement clustering

## File Layout

```
security_analyzer/
├── CLI Analyzer (legacy, still supported)
│   ├── security_analyzer.py              Main analyzer (all detection logic)
│   ├── threat_intelligence.py            IOC extraction, threat scoring, context generation, remediation
│   ├── log_parser.py                     Advanced log field extraction, event correlation, attack patterns
│   ├── wazuh_integration.py              Wazuh Manager client
│   ├── run_admin.bat                     Admin elevation wrapper
│   ├── run_admin.ps1                     PowerShell admin wrapper
│
├── Web Dashboard Backend (FastAPI)
│   ├── app/
│   │   ├── main.py                       FastAPI app factory, CORS, static mount
│   │   ├── routers/
│   │   │   ├── system.py                 GET /api/system/info
│   │   │   ├── analysis.py               POST /run, GET /stream/{id}, GET /latest
│   │   │   └── events.py                 GET /alerts, /summary/timeline, /summary/by-type
│   │   ├── services/
│   │   │   ├── analyzer_service.py       Cross-platform adapter, IP detection, admin check
│   │   └── schemas/
│   │       └── models.py                 Pydantic models (Alert, Summary, SystemInfo, etc.)
│
├── Web Dashboard Frontend (React + Vite)
│   ├── frontend/
│   │   ├── package.json                  npm dependencies (React, Vite, Recharts, Zustand)
│   │   ├── vite.config.ts                Vite config, /api proxy to :8000
│   │   ├── tailwind.config.js            TailwindCSS dark theme, severity colors
│   │   ├── postcss.config.js             PostCSS for Tailwind
│   │   ├── tsconfig.json                 TypeScript strict mode
│   │   ├── index.html                    HTML root, dark class on <html>
│   │   ├── dist/                         Built SPA (generated by npm run build)
│   │   └── src/
│   │       ├── main.tsx                  React entry point
│   │       ├── App.tsx                   React Router setup (3 routes)
│   │       ├── index.css                 Tailwind directives + custom styling
│   │       ├── types/index.ts            TypeScript interfaces (Alert, SystemInfo, etc.)
│   │       ├── api/client.ts             Axios API client with typed methods
│   │       ├── store/analysisStore.ts    Zustand state (result, progress, filters)
│   │       ├── hooks/                    useAnalysis, useAlerts, useSystemInfo
│   │       ├── pages/                    DashboardPage, AlertsPage, SettingsPage
│   │       └── components/               Layout, shared, dashboard, alerts, analysis
│
├── Shared Resources
│   ├── requirements.txt                  Python dependencies (FastAPI, pandas, colorama, etc.)
│   ├── logs.csv                          CSV test data
│   ├── data/sample_logs.csv              Sample Event Log data
│   ├── docker-compose.yml                Wazuh stack (dev/test only)
│   ├── wazuh-agent-4.7.0-1.msi           Wazuh Agent installer
│   ├── reports/                          Output directory (auto-created by CLI)
│   ├── wazuh_events.jsonl                Wazuh events log (fallback, auto-created)
│   ├── CLAUDE.md                         This file
│   └── WAZUH_INTEGRATION.md              Wazuh setup & troubleshooting
```

## Developing the Dashboard

### Backend Changes
When modifying the analyzer logic or API:
1. Edit `security_analyzer.py` (detection methods, Event/Alert classes, CONFIG thresholds)
2. Edit `app/services/analyzer_service.py` if cross-platform behavior needs adjustment
3. Backend with `--reload` picks up changes automatically
4. Verify API response: `curl http://localhost:8000/api/analysis/latest`

### Frontend Changes
When modifying UI, components, or charts:
1. Edit files in `frontend/src/` (components, pages, hooks, store)
2. Vite dev server (`npm run dev`) hot-reloads changes
3. TypeScript compilation happens on save; fix errors in terminal
4. Verify in browser: `http://localhost:5173`

### Adding New API Endpoints
1. Define Pydantic model in `app/schemas/models.py`
2. Create/edit router in `app/routers/`
3. Import router in `app/main.py` and register with `app.include_router()`
4. Update `frontend/src/api/client.ts` with typed fetch method
5. Update `frontend/src/types/index.ts` if new TypeScript interface needed

### Common Development Tasks

**Run full stack locally:**
```powershell
# Terminal 1: Backend
python -m uvicorn app.main:app --reload

# Terminal 2: Frontend dev server
cd frontend && npm run dev
# Opens http://localhost:5173 (proxies /api to :8000)
```

**Test with CSV (no admin required):**
- Dashboard defaults to CSV; select "CSV File" in Run Analysis panel
- File path: `logs.csv` in project root

**Test with Event Logs (admin required):**
- Right-click terminal → Run as Administrator
- Restart backend in admin terminal
- Event Log option becomes available in dashboard
- Dashboard shows "✓ Running with Administrator Privileges" banner

**Build for production:**
```powershell
# Frontend: generates frontend/dist/
cd frontend && npm run build

# Start backend in production mode
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# Backend auto-serves SPA from frontend/dist/
# Open http://localhost:8000
```

**Check TypeScript errors:**
```powershell
cd frontend && npm run type-check  # (if script added to package.json)
# Or run: tsc
```

### Debugging SSE Stream
If progress events don't appear:
1. Check browser DevTools → Network → look for `/stream/{job_id}` request
2. Verify it shows `text/event-stream` content-type
3. Check backend logs for exceptions during `run_analysis_sync()`
4. Ensure `run_in_executor()` callback is called; if not, synchronous code blocks event loop

### Admin Status & UI Behavior
- Dashboard calls `GET /api/system/info` on mount; gets `is_admin` boolean
- Frontend stores in `useSystemInfo()` hook
- If `is_admin=False` on Windows:
  - StatusBanner shows red warning
  - RunAnalysisPanel disables "Windows Event Log" radio button
  - Only CSV analysis available
- If admin, green success banner shown; both options available

## Dependencies & Imports

### External Packages (Backend)
- **fastapi**: Web framework, SSE, request/response handling
- **uvicorn**: ASGI server
- **pydantic**: Request/response validation, type hints
- **python-multipart**: Form data parsing
- **pandas**: CSV export, event data manipulation
- **colorama**: Cross-platform colored terminal output
- **plotly**: Chart generation (currently unused but included for v3.0)

### Standard Library (Backend)
- **subprocess**: PowerShell invocation (log reading)
- **socket**: TCP connection to Wazuh Manager, local IP detection
- **asyncio**: Non-blocking executor for subprocess calls
- **json**: Parsing PowerShell output & formatting Wazuh events
- **ctypes, platform, socket, getpass**: System introspection
- **datetime, pathlib, enum**: Data structures

### External Packages (Frontend)
- **react, react-dom**: UI framework, 18.x
- **vite**: Build tool, dev server with HMR
- **typescript**: Type safety, strict mode
- **tailwindcss**: Utility CSS, dark theme
- **recharts**: Data visualization (AreaChart, BarChart)
- **axios**: HTTP client, typed API calls
- **zustand**: Lightweight state management
- **react-router-dom**: Client-side routing
- **lucide-react**: Icons (Shield, AlertCircle, Lock, etc.)

### Wazuh Agent (Windows)
- **Wazuh Agent 4.7.0**: Installed via MSI; communicates with Manager on port 1514

**No external API calls** except Wazuh Manager (optional, with graceful fallback).

## Dashboard-Specific Notes

### Admin Privilege Enforcement
- **CLI analyzer** (`security_analyzer.py`): Checks admin at startup; fails with instructions if not admin
- **Dashboard backend** (`analyzer_service.py`): `_is_admin()` returns False on non-admin, always accessible
- **Dashboard frontend**: Disables Event Log option if `is_admin=False` on Windows platform
- **User experience**: Red warning banner if not admin; CSV analysis still available
- **Design**: Graceful degradation rather than hard failure

### Cross-Platform Behavior
- **Windows**: Full support (Event Logs, PowerShell, ctypes admin check)
- **Linux/macOS**: Supported for CSV analysis only; Event Log disabled
- `analyzer_service.py` guards all `ctypes.windll` calls with try/except
- `is_admin` always False on non-Windows platforms
- IP detection works on all platforms (socket method, no Windows-specific code)

### State Management Philosophy
- **Frontend**: Zustand store holds single source of truth (result, progress, filters)
- **Backend**: In-memory cache of latest result; no persistent database
- **SSE streaming**: One-way server→client; client doesn't need acknowledgments
- **No caching layer**: Each fresh `/api/events` request computes from last result; no Redis/memcached needed
- **Implication**: Restarting backend loses cached result; must re-run analysis

### Performance Considerations
- **Chunk size warning**: Frontend build is ~600 KB gzipped; acceptable for dashboard
- **Analysis duration**: WindowsLogReader times out at 30s on large Security Event Logs
- **Pagination**: `/api/events?page=1&per_page=25` reduces payload; required for >1000 alerts
- **No WebSocket**: SSE chosen over WebSocket for simpler implementation; sufficient for one-way streaming

### Security Notes
- **No authentication**: Dashboard designed for local/trusted network use
- **CORS enabled** in dev (Vite proxy); disabled in production (same-origin serving)
- **Pydantic validation**: All requests validated; type mismatches rejected
- **No secrets**: No API keys, tokens, or credentials in frontend/backend code
- **Event Log access**: Requires Windows Administrator (enforced by OS, not application)
