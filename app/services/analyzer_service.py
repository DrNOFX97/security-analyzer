import sys
import platform
import ctypes
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import asyncio
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from security_analyzer import (
    SecurityAnalyzer, WindowsLogReader, PermissionChecker,
    EnvironmentInfo, Alert, AlertLevel, Event
)
from app.schemas.models import AlertModel, SummaryModel, AnalysisResultModel


class AnalyzerService:
    def __init__(self):
        self._last_result: Optional[AnalysisResultModel] = None
        self._jobs: Dict[str, asyncio.Future] = {}

    def get_system_info(self) -> Dict[str, Any]:
        hostname = EnvironmentInfo.get_hostname()
        user = EnvironmentInfo.get_current_user()
        domain = EnvironmentInfo.get_domain()
        os_version = EnvironmentInfo.get_os_version()

        is_admin = self._is_admin()
        wazuh_available = self._check_wazuh()

        # Get IP address
        ip_address = self._get_local_ip()

        plat = platform.system()
        if plat == 'Windows':
            platform_str = 'windows'
        elif plat == 'Darwin':
            platform_str = 'darwin'
        else:
            platform_str = 'linux'

        # Get extended system info (Windows)
        os_caption = 'Desconhecido'
        owner = 'Desconhecido'
        model = 'Desconhecido'
        total_ram_gb = 0
        free_ram_mb = 0

        if platform_str == 'windows':
            try:
                import subprocess
                import json

                # Get OS Caption
                result = subprocess.run(
                    ['powershell', '-Command', 'Get-WmiObject Win32_OperatingSystem | Select-Object -ExpandProperty Caption'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    os_caption = result.stdout.strip()

                # Get Owner (PrimaryOwnerName)
                result = subprocess.run(
                    ['powershell', '-Command', 'Get-WmiObject Win32_ComputerSystem | Select-Object -ExpandProperty PrimaryOwnerName'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    owner = result.stdout.strip() or 'Desconhecido'

                # Get Model
                result = subprocess.run(
                    ['powershell', '-Command', 'Get-WmiObject Win32_ComputerSystem | Select-Object -ExpandProperty Model'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    model = result.stdout.strip()

                # Get Total RAM
                result = subprocess.run(
                    ['powershell', '-Command', '[Math]::Round((Get-WmiObject Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB, 2)'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    try:
                        total_ram_gb = float(result.stdout.strip())
                    except:
                        total_ram_gb = 0

                # Get Free RAM
                result = subprocess.run(
                    ['powershell', '-Command', '[Math]::Round((Get-WmiObject Win32_OperatingSystem).FreePhysicalMemory / 1MB, 2)'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    try:
                        free_ram_mb = float(result.stdout.strip())
                    except:
                        free_ram_mb = 0
            except Exception as e:
                print(f'Warning: Could not gather extended system info: {e}')

        return {
            'hostname': hostname,
            'platform': platform_str,
            'os_version': os_version,
            'os_caption': os_caption,
            'owner': owner,
            'model': model,
            'total_ram_gb': total_ram_gb,
            'free_ram_mb': free_ram_mb,
            'current_user': user,
            'domain': domain,
            'is_admin': is_admin,
            'wazuh_available': wazuh_available,
            'ip_address': ip_address,
            'analyzer_version': '2.0'
        }

    def _is_admin(self) -> bool:
        if platform.system() != 'Windows':
            return False
        try:
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except:
            return False

    def _check_wazuh(self) -> bool:
        try:
            import wazuh_integration
            return True
        except ImportError:
            return False

    def _get_local_ip(self) -> str:
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            try:
                return socket.gethostbyname(socket.gethostname())
            except:
                return 'Unable to detect'

    def run_analysis_sync(self, source: str, csv_path: str = 'logs.csv',
                         hours: int = 24, progress_callback=None) -> AnalysisResultModel:
        """
        Synchronous analysis function. Call via run_in_executor to avoid blocking.
        """
        start_time = datetime.now()

        try:
            if progress_callback:
                progress_callback(stage='reading', channel='Initializing', pct=1)

            # Load events
            if source == 'csv':
                if progress_callback:
                    progress_callback(stage='reading', channel='CSV File', pct=5)
                import pandas as pd
                df = pd.read_csv(csv_path)
                events = []
                for _, row in df.iterrows():
                    event = Event(
                        event_id=int(row.get('EventID', 0)),
                        timestamp=datetime.strptime(
                            f"{row.get('Date', '')} {row.get('Time', '')}",
                            '%d/%m/%Y %H:%M:%S'
                        ),
                        account=row.get('Account', 'SYSTEM'),
                        source_ip=row.get('SourceIP', 'N/A') if row.get('SourceIP') else 'N/A',
                        message=row.get('Message', ''),
                        log_channel='Security'
                    )
                    events.append(event)
                if progress_callback:
                    progress_callback(stage='reading', channel='CSV File', count=len(events), pct=30)

            else:  # eventlog
                if not self._is_admin():
                    raise PermissionError('Event Log reading requires Administrator')
                if progress_callback:
                    progress_callback(stage='reading', channel='Windows Event Logs', pct=5)
                reader = WindowsLogReader(hours=hours)
                events = reader.read_all_channels()
                if progress_callback:
                    progress_callback(stage='reading', channel='Windows Event Logs', count=len(events), pct=30)

            # Analyze
            if progress_callback:
                progress_callback(stage='analyzing', detector='Detectando ameaças', pct=35)
            analyzer = SecurityAnalyzer(events)
            analyzer.analyze_all()

            if progress_callback:
                progress_callback(stage='analyzing', detector=f'Análise concluída - {len(analyzer.alerts)} ameaças', count=len(analyzer.alerts), pct=85)

            if progress_callback:
                progress_callback(stage='finalizing', detector='Gerando relatório', pct=95)

            # Build response
            summary = analyzer.get_summary()
            overall_risk = summary['overall_risk']

            alerts = []
            for idx, alert in enumerate(analyzer.alerts):
                alert_model = AlertModel(
                    id=f"{alert.alert_type.lower().replace(' ', '-')}-{idx}",
                    level=alert.level,
                    level_numeric=alert.level_numeric,
                    alert_type=alert.alert_type,
                    details=alert.details,
                    timestamp=alert.timestamp.isoformat(),
                    threat_score=alert.threat_score,
                    severity_level=alert.severity_level,
                    iocs={'ips': alert.iocs.get('ips', []),
                          'accounts': alert.iocs.get('accounts', []),
                          'commands': alert.iocs.get('commands', []),
                          'domains': alert.iocs.get('domains', []),
                          'hashes': alert.iocs.get('hashes', []),
                          'registry_keys': alert.iocs.get('registry_keys', []),
                          'file_paths': alert.iocs.get('file_paths', [])},
                    context=alert.threat_context,
                    remediation=alert.remediation_steps
                )
                alerts.append(alert_model)

            summary_model = SummaryModel(
                total_events=summary['total_events'],
                failed_logins=summary['failed_logins'],
                success_logins=summary['success_logins'],
                accounts_created=summary['accounts_created'],
                critical_alerts=summary['critical_alerts'],
                high_alerts=summary['high_alerts'],
                medium_alerts=summary['medium_alerts'],
                overall_risk=overall_risk
            )

            if progress_callback:
                progress_callback(stage='finalizing', detector='Complete', pct=100)

            duration = (datetime.now() - start_time).total_seconds()

            result = AnalysisResultModel(
                ran_at=start_time.isoformat(),
                source=source,
                duration_seconds=round(duration, 2),
                summary=summary_model,
                alerts=alerts
            )

            self._last_result = result
            return result

        except Exception as e:
            raise RuntimeError(f'Analysis failed: {str(e)}')

    def get_latest_result(self) -> Optional[AnalysisResultModel]:
        return self._last_result

    def get_alerts(self, page: int = 1, per_page: int = 25,
                   levels: Optional[List[str]] = None,
                   type_query: Optional[str] = None,
                   sort_by: str = 'timestamp',
                   order: str = 'desc') -> Dict[str, Any]:
        if not self._last_result:
            return {'total': 0, 'page': page, 'per_page': per_page, 'items': []}

        alerts = self._last_result.alerts

        # Filter by level
        if levels:
            alerts = [a for a in alerts if a.level in levels]

        # Filter by type
        if type_query:
            alerts = [a for a in alerts if type_query.lower() in a.alert_type.lower()]

        # Sort
        if sort_by == 'timestamp':
            alerts = sorted(alerts, key=lambda a: a.timestamp, reverse=(order == 'desc'))
        elif sort_by == 'level_numeric':
            alerts = sorted(alerts, key=lambda a: a.level_numeric, reverse=(order == 'desc'))

        # Paginate
        total = len(alerts)
        start = (page - 1) * per_page
        end = start + per_page
        items = alerts[start:end]

        return {
            'total': total,
            'page': page,
            'per_page': per_page,
            'items': [item.model_dump() for item in items]
        }

    def get_timeline(self, bucket: str = 'hour') -> Dict[str, Any]:
        if not self._last_result:
            return {'buckets': []}

        # Group alerts by time bucket
        buckets_dict: Dict[str, Dict] = defaultdict(
            lambda: {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'total': 0}
        )

        for alert in self._last_result.alerts:
            ts = datetime.fromisoformat(alert.timestamp)
            if bucket == 'hour':
                key = ts.strftime('%Y-%m-%dT%H:00:00')
            else:  # day
                key = ts.strftime('%Y-%m-%dT00:00:00')

            buckets_dict[key]['total'] += 1
            level_lower = alert.level.lower()
            buckets_dict[key][level_lower] += 1

        buckets = [
            {
                'time': time_key,
                **counts
            }
            for time_key, counts in sorted(buckets_dict.items())
        ]

        return {'buckets': buckets}

    def get_type_summary(self) -> Dict[str, Any]:
        if not self._last_result:
            return {'types': []}

        type_counts: Dict[str, tuple] = {}
        for alert in self._last_result.alerts:
            if alert.alert_type not in type_counts:
                type_counts[alert.alert_type] = (0, alert.level)
            count, max_level = type_counts[alert.alert_type]

            # Keep the highest severity level for this type
            level_numeric = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}
            max_level_numeric = level_numeric.get(max_level, 0)
            alert_level_numeric = level_numeric.get(alert.level, 0)

            if alert_level_numeric > max_level_numeric:
                max_level = alert.level

            type_counts[alert.alert_type] = (count + 1, max_level)

        types = [
            {'alert_type': alert_type, 'count': count, 'max_level': max_level}
            for alert_type, (count, max_level) in sorted(type_counts.items())
        ]

        return {'types': types}


# Global instance
analyzer_service = AnalyzerService()
