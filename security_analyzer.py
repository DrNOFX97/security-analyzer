#!/usr/bin/env python3
"""
Windows Security Log Analyzer v2.0
Reads REAL Windows Event Logs and performs advanced security analysis
"""

import pandas as pd
import json
import subprocess
import sys
import os
from datetime import datetime, timedelta
from collections import defaultdict
from enum import Enum
from pathlib import Path
import platform
import socket
import getpass
import ctypes

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    sys.stdout.reconfigure(encoding='utf-8')

import plotly.graph_objects as go
from colorama import init, Fore, Back, Style
from tabulate import tabulate

# Threat Intelligence & IOC Detection
from threat_intelligence import ThreatIntelligence
from log_parser import LogParser

# Wazuh integration
try:
    from wazuh_integration import WazuhIntegration
    WAZUH_AVAILABLE = True
except ImportError:
    WAZUH_AVAILABLE = False

init(autoreset=True)

# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    'TIMEFRAME_HOURS': 24,
    'BRUTE_FORCE_THRESHOLD': 5,
    'QUICK_BREACH_TIME_SECONDS': 300,
    'OUTPUT_DIR': Path('./reports'),
    'LOG_DIR': Path('./logs'),
}

# Event IDs per log channel
EVENT_IDS = {
    'Security': {
        4625: 'Failed Logon',
        4624: 'Successful Logon',
        4720: 'User Account Created',
        4722: 'User Account Enabled',
        4724: 'Password Reset',
        4725: 'User Account Disabled',
        4728: 'User Added to Group',
        4732: 'User Removed from Group',
        5379: 'Credential Manager Access',
    },
    'System': {
        6005: 'System Startup',
        6006: 'System Shutdown',
        7045: 'New Service Installed',
        1074: 'System Restart',
    },
    'Application': {
        1000: 'Application Crash',
        1001: 'Windows Error Reporting',
    },
    'PowerShell': {
        4104: 'Script Block Logging',
        4103: 'Module Logging',
    }
}

SUSPICIOUS_USERNAMES = ['test', 'admin2', 'temp', 'backup2', 'service2', 'guest2']

# ============================================================================
# ENUMS & CLASSES
# ============================================================================

class AlertLevel(Enum):
    LOW = (1, '[LOW]', 'LOW')
    MEDIUM = (2, '[MEDIUM]', 'MEDIUM')
    HIGH = (3, '[HIGH]', 'HIGH')
    CRITICAL = (4, '[CRITICAL]', 'CRITICAL')


class EnvironmentInfo:
    """System environment information"""

    @staticmethod
    def is_admin():
        try:
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except:
            return False

    @staticmethod
    def get_hostname():
        return socket.gethostname()

    @staticmethod
    def get_os_version():
        return platform.version()

    @staticmethod
    def get_current_user():
        return getpass.getuser()

    @staticmethod
    def get_domain():
        try:
            return os.environ.get('USERDOMAIN', 'WORKGROUP')
        except:
            return 'UNKNOWN'

    @staticmethod
    def print_banner():
        is_admin = EnvironmentInfo.is_admin()
        admin_status = f"{Fore.GREEN}YES [OK]{Style.RESET_ALL}" if is_admin else f"{Fore.RED}NO [ELEVATED REQUIRED]{Style.RESET_ALL}"

        print(f'\n{Back.BLUE}{Fore.WHITE}{"="*60}{Style.RESET_ALL}')
        print(f'{Back.BLUE}{Fore.WHITE}{"WINDOWS SECURITY LOG ANALYZER v2.0":^60}{Style.RESET_ALL}')
        print(f'{Back.BLUE}{Fore.WHITE}{"="*60}{Style.RESET_ALL}\n')

        print(f'{Fore.CYAN}[SYSTEM INFO]{Style.RESET_ALL}')
        print(f'  Hostname:    {EnvironmentInfo.get_hostname()}')
        print(f'  User:        {EnvironmentInfo.get_current_user()}')
        print(f'  Domain:      {EnvironmentInfo.get_domain()}')
        print(f'  OS:          {EnvironmentInfo.get_os_version()}')
        print(f'  Date:        {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        print(f'  Admin:       {admin_status}\n')

        return is_admin


class PermissionChecker:
    """Check log access permissions"""

    @staticmethod
    def check_admin():
        if not EnvironmentInfo.is_admin():
            print(f'{Fore.RED}[!] ERROR: Script requires Administrator privileges{Style.RESET_ALL}')
            print(f'{Fore.YELLOW}[*] Please run as Admin or execute:{Style.RESET_ALL}')
            print(f'    powershell -Command "Start-Process python \'%~0\' -Verb RunAs"')
            return False
        return True

    @staticmethod
    def check_log_access():
        logs = ['Security', 'System', 'Application', 'Microsoft-Windows-PowerShell/Operational']
        accessible = {}

        print(f'{Fore.CYAN}[LOG ACCESS]{Style.RESET_ALL}')
        for log_name in logs:
            try:
                # Try to read first event from each log
                ps_cmd = f'Get-WinEvent -LogName "{log_name}" -MaxEvents 1 | ConvertTo-Json -Depth 1'
                result = subprocess.run(
                    ['powershell', '-Command', ps_cmd],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                accessible[log_name] = result.returncode == 0
                status = f"{Fore.GREEN}[OK]{Style.RESET_ALL}" if accessible[log_name] else f"{Fore.RED}[FAIL]{Style.RESET_ALL}"
                print(f'  {status} {log_name}')
            except Exception as e:
                accessible[log_name] = False
                print(f'  {Fore.RED}[FAIL]{Style.RESET_ALL} {log_name}')

        return accessible


class Event:
    """Represents a single security event with enhanced field extraction"""

    def __init__(self, event_id, timestamp, account, source_ip, message, log_channel='Security'):
        self.event_id = int(event_id) if event_id else 0
        self.timestamp = timestamp
        self.account = account or 'SYSTEM'
        self.source_ip = source_ip or 'N/A'
        self.message = message or ''
        self.log_channel = log_channel

        # Parse additional fields using LogParser
        self.parsed = LogParser.parse_log_line(message)

    def __str__(self):
        return f"Event({self.event_id}, {self.account}, {self.source_ip}, {self.timestamp})"


class WindowsLogReader:
    """Read events from Windows Event Log"""

    def __init__(self, hours=24):
        self.hours = hours
        self.events = []

    def read_all_channels(self):
        """Read from all 4 channels"""
        print(f'\n{Fore.CYAN}[READING LOGS]{Style.RESET_ALL}')
        print(f'  Timeframe: Last {self.hours} hours\n')

        for log_name in ['Security', 'System', 'Application', 'Microsoft-Windows-PowerShell/Operational']:
            self._read_log(log_name)

        print(f'{Fore.GREEN}[+] Total events loaded: {len(self.events)}{Style.RESET_ALL}\n')
        return self.events

    def _read_log(self, log_name):
        """Read specific log channel"""
        try:
            # PowerShell command to read events as JSON
            ps_cmd = f'''
Get-WinEvent -FilterHashtable @{{
    LogName = '{log_name}'
    StartTime = (Get-Date).AddHours(-{self.hours})
}} -ErrorAction SilentlyContinue |
Select-Object @{{
    Name='Id'; Expression={{$_.Id}}
}},@{{
    Name='TimeCreated'; Expression={{$_.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')}}
}},@{{
    Name='UserID'; Expression={{$_.Properties[1].Value}}
}},@{{
    Name='Message'; Expression={{$_.Message -replace "`n"," " -replace "`r"," "}}
}} |
ConvertTo-Json -Depth 1
            '''

            result = subprocess.run(
                ['powershell', '-Command', ps_cmd],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0 and result.stdout.strip():
                data = json.loads(result.stdout)
                if isinstance(data, list):
                    events_list = data
                else:
                    events_list = [data] if data else []

                for item in events_list:
                    try:
                        event = Event(
                            event_id=item.get('Id', 0),
                            timestamp=datetime.strptime(item.get('TimeCreated', ''), '%Y-%m-%d %H:%M:%S'),
                            account=item.get('UserID', 'SYSTEM'),
                            source_ip='N/A',
                            message=item.get('Message', ''),
                            log_channel=log_name
                        )
                        self.events.append(event)
                    except Exception as e:
                        pass

                count = len([e for e in self.events if e.log_channel == log_name])
                print(f'  [+] {log_name:40} → {count} events')

        except Exception as e:
            print(f'  [-] {log_name:40} → Error: {str(e)[:40]}')


class Alert:
    """Security alert with IOC enrichment and SIEM context"""

    def __init__(self, level, alert_type, details, timestamp=None, event_message=''):
        self.level_enum = level
        self.level = level.value[2]  # Extract string value: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        self.level_numeric = level.value[0]  # Extract numeric: 1, 2, 3, 4
        self.alert_type = alert_type
        self.details = details
        self.timestamp = timestamp or datetime.now()
        self.event_message = event_message

        # Extract IOCs
        self.iocs = ThreatIntelligence.extract_iocs(event_message, details.get('event_id', 0))

        # Calculate threat score
        ioc_count = sum(len(v) for v in self.iocs.values())
        event_freq = details.get('frequency', 1)
        self.threat_score, self.severity_level = ThreatIntelligence.calculate_threat_score(
            alert_type, ioc_count, event_freq
        )

        # Generate threat context
        self.threat_context = ThreatIntelligence.generate_threat_context(alert_type, details)

        # Get remediation steps
        self.remediation_steps = ThreatIntelligence.get_remediation_steps(alert_type)

    def to_dict(self):
        return {
            'level': self.level,
            'type': self.alert_type,
            'threat_score': self.threat_score,
            'severity_level': self.severity_level,
            'details': self.details,
            'iocs': self.iocs,
            'context': self.threat_context,
            'remediation': self.remediation_steps,
            'timestamp': self.timestamp.isoformat(),
        }


class SecurityAnalyzer:
    """Main analysis engine"""

    def __init__(self, events):
        self.events = events
        self.alerts = []

    def analyze_all(self):
        """Run all analyses"""
        self.detect_brute_force()
        self.detect_account_takeover()
        self.detect_account_changes()
        self.detect_suspicious_services()
        self.detect_powershell_anomalies()
        self.analyze_event_correlation()

    def detect_brute_force(self):
        """Detect multiple failed logins (Event 4625)"""
        failed = defaultdict(lambda: defaultdict(list))

        for event in self.events:
            if event.event_id == 4625:
                failed[event.source_ip][event.account].append(event)

        for source_ip, accounts in failed.items():
            for account, events_list in accounts.items():
                if len(events_list) >= CONFIG['BRUTE_FORCE_THRESHOLD']:
                    level = AlertLevel.CRITICAL if len(events_list) >= 20 else AlertLevel.HIGH

                    alert = Alert(
                        level=level,
                        alert_type='Brute Force Attack',
                        details={
                            'source_ip': source_ip,
                            'target_account': account,
                            'failed_attempts': len(events_list),
                            'first_attempt': str(events_list[0].timestamp),
                            'last_attempt': str(events_list[-1].timestamp),
                            'event_id': 4625,
                            'frequency': len(events_list),
                        },
                        event_message=' | '.join([e.message for e in events_list[:3]])
                    )
                    self.alerts.append(alert)

    def detect_account_takeover(self):
        """Detect failed logins followed by success"""
        failed_by_account = defaultdict(list)
        success_by_account = defaultdict(list)

        for event in self.events:
            if event.event_id == 4625:
                failed_by_account[event.account].append(event)
            elif event.event_id == 4624:
                success_by_account[event.account].append(event)

        for account in failed_by_account:
            if account in success_by_account:
                for failed in failed_by_account[account]:
                    for success in success_by_account[account]:
                        time_diff = (success.timestamp - failed.timestamp).total_seconds()
                        if 0 < time_diff < CONFIG['QUICK_BREACH_TIME_SECONDS']:
                            event_messages = f"Failed: {failed.message} | Success: {success.message}"
                            alert = Alert(
                                level=AlertLevel.CRITICAL,
                                alert_type='Account Takeover',
                                details={
                                    'account': account,
                                    'failed_before_success': True,
                                    'time_to_breach_seconds': int(time_diff),
                                    'success_at': str(success.timestamp),
                                    'event_id': 4624,
                                    'frequency': 2,
                                },
                                event_message=event_messages
                            )
                            self.alerts.append(alert)
                            break

    def detect_account_changes(self):
        """Detect suspicious account creations"""
        for event in self.events:
            if event.event_id == 4720:
                # Extract username from message
                username = event.message.split('New Account Name')[1].split('New Account ID')[0].strip().split()[-1] if 'New Account Name' in event.message else event.account

                level = AlertLevel.CRITICAL if username.lower() in SUSPICIOUS_USERNAMES else AlertLevel.MEDIUM

                alert = Alert(
                    level=level,
                    alert_type='Account Manipulation',
                    details={
                        'username': username,
                        'created_at': str(event.timestamp),
                        'suspicious_name': username.lower() in SUSPICIOUS_USERNAMES,
                        'event_id': 4720,
                        'frequency': 1,
                    },
                    event_message=event.message
                )
                self.alerts.append(alert)

    def detect_suspicious_services(self):
        """Detect new service installations (Event 7045)"""
        for event in self.events:
            if event.event_id == 7045:
                alert = Alert(
                    level=AlertLevel.HIGH,
                    alert_type='Suspicious Service',
                    details={
                        'timestamp': str(event.timestamp),
                        'message': event.message[:100],
                        'event_id': 7045,
                        'frequency': 1,
                    },
                    event_message=event.message
                )
                self.alerts.append(alert)

    def detect_powershell_anomalies(self):
        """Detect suspicious PowerShell activity (Event 4104)"""
        for event in self.events:
            if event.event_id == 4104:
                # Check for suspicious keywords
                suspicious_keywords = ['System.Net', 'DownloadString', 'Invoke-', 'IEX', 'reflection', 'Bypass']
                if any(keyword in event.message for keyword in suspicious_keywords):
                    alert = Alert(
                        level=AlertLevel.HIGH,
                        alert_type='PowerShell Anomaly',
                        details={
                            'timestamp': str(event.timestamp),
                            'message': event.message[:100],
                            'event_id': 4104,
                            'frequency': 1,
                        },
                        event_message=event.message
                    )
                    self.alerts.append(alert)

    def analyze_event_correlation(self):
        """Analyze event sequences for advanced attack patterns"""
        if not self.events:
            return

        # Use LogParser to correlate events
        correlations = LogParser.correlate_events([
            {
                'raw': e.message,
                'timestamp': e.timestamp,
                'hostname': 'LOCAL',
                'severity': 'INFO',
                'process': None,
                'message': e.message,
                'source_ip': e.source_ip,
                'dest_ip': None,
                'port': None,
                'action': e.parsed.get('action', 'unknown'),
                'user': e.account,
                'status': None,
            }
            for e in self.events
        ])

        for correlation in correlations:
            if correlation.get('pattern') != 'Padrão Suspeito':
                pattern_level = AlertLevel.CRITICAL if correlation.get('severity') == 'HIGH' else AlertLevel.HIGH

                event_messages = ' | '.join([
                    e.get('message', '')[:50]
                    for e in correlation.get('events', [])[:3]
                ])

                alert = Alert(
                    level=pattern_level,
                    alert_type='Detected Attack Pattern',
                    details={
                        'source_ip': correlation.get('source_ip'),
                        'event_count': correlation.get('event_count'),
                        'time_span': correlation.get('time_span'),
                        'pattern': correlation.get('pattern'),
                        'severity': correlation.get('severity'),
                        'frequency': correlation.get('event_count', 1),
                    },
                    event_message=event_messages
                )
                self.alerts.append(alert)

    def get_summary(self):
        """Get summary statistics"""
        failed = len([e for e in self.events if e.event_id == 4625])
        success = len([e for e in self.events if e.event_id == 4624])
        created = len([e for e in self.events if e.event_id == 4720])

        critical = len([a for a in self.alerts if a.level == 'CRITICAL'])
        high = len([a for a in self.alerts if a.level == 'HIGH'])
        medium = len([a for a in self.alerts if a.level == 'MEDIUM'])

        overall_risk = 'CRITICAL' if critical > 0 else ('HIGH' if high > 0 else 'MEDIUM')

        return {
            'total_events': len(self.events),
            'failed_logins': failed,
            'success_logins': success,
            'accounts_created': created,
            'critical_alerts': critical,
            'high_alerts': high,
            'medium_alerts': medium,
            'overall_risk': overall_risk,
        }


class Report:
    """Generate reports"""

    def __init__(self, analyzer, output_dir='./reports'):
        self.analyzer = analyzer
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)
        self.timestamp = datetime.now()

    def generate_console_report(self):
        """Print formatted report"""
        summary = self.analyzer.get_summary()

        print(f'{Fore.CYAN}[ANALYSIS RESULTS]{Style.RESET_ALL}')
        print(f'  Total Events: {summary["total_events"]}')
        print(f'  Failed Logins: {summary["failed_logins"]}')
        print(f'  Success Logins: {summary["success_logins"]}')
        print(f'  Accounts Created: {summary["accounts_created"]}')
        print(f'  Overall Risk: {summary["overall_risk"]}\n')

        print(f'{Fore.CYAN}[ALERTS]{Style.RESET_ALL}')
        print(f'  [CRITICAL]: {summary["critical_alerts"]}')
        print(f'  [HIGH]: {summary["high_alerts"]}')
        print(f'  [MEDIUM]: {summary["medium_alerts"]}\n')

        if self.analyzer.alerts:
            critical = [a for a in self.analyzer.alerts if a.level == 'CRITICAL']
            if critical:
                print(f'{Fore.RED}[TOP CRITICAL ALERTS]{Style.RESET_ALL}')
                for i, alert in enumerate(critical[:5], 1):
                    print(f'  {i}. {alert.alert_type}')
                    for key, val in alert.details.items():
                        print(f'     - {key}: {val}')
                print()

    def export_csv(self):
        """Export to CSV"""
        try:
            filepath = self.output_dir / f'alerts_{self.timestamp.strftime("%Y%m%d_%H%M%S")}.csv'
            data = [alert.to_dict() for alert in self.analyzer.alerts]
            if data:
                df = pd.DataFrame(data)
                df.to_csv(filepath, index=False)
                print(f'{Fore.GREEN}[+] CSV exported: {filepath}{Style.RESET_ALL}')
            return filepath
        except Exception as e:
            print(f'{Fore.RED}[-] Error exporting CSV: {e}{Style.RESET_ALL}')
            return None

    def export_txt(self):
        """Export to TXT"""
        try:
            filepath = self.output_dir / f'report_{self.timestamp.strftime("%Y%m%d_%H%M%S")}.txt'
            with open(filepath, 'w', encoding='utf-8') as f:
                summary = self.analyzer.get_summary()
                f.write('WINDOWS SECURITY LOG ANALYSIS REPORT\n')
                f.write('='*70 + '\n\n')
                f.write(f'Generated: {self.timestamp.isoformat()}\n')
                f.write(f'Total Events: {summary["total_events"]}\n')
                f.write(f'Alerts (CRITICAL/HIGH): {summary["critical_alerts"]}/{summary["high_alerts"]}\n\n')

                for alert in self.analyzer.alerts[:20]:
                    f.write(f'{alert.level}: {alert.alert_type}\n')
                    for key, val in alert.details.items():
                        f.write(f'  {key}: {val}\n')
                    f.write('\n')

            print(f'{Fore.GREEN}[+] TXT exported: {filepath}{Style.RESET_ALL}')
            return filepath
        except Exception as e:
            print(f'{Fore.RED}[-] Error exporting TXT: {e}{Style.RESET_ALL}')
            return None

    def save_all(self):
        """Save all reports"""
        self.generate_console_report()
        self.export_csv()
        self.export_txt()


# ============================================================================
# MAIN
# ============================================================================

def main():
    import argparse

    # Parse arguments first to check if CSV mode
    parser = argparse.ArgumentParser(description='Windows Security Log Analyzer')
    parser.add_argument('--input', '-i', default=None, help='Input CSV file (optional)')
    parser.add_argument('--hours', '-H', type=int, default=24, help='Hours to analyze')
    args = parser.parse_args()

    # Show banner with system info
    is_admin = EnvironmentInfo.print_banner()

    # Check admin privileges only if NOT using CSV mode
    if not args.input and not PermissionChecker.check_admin():
        sys.exit(1)

    # Load events
    if args.input:
        # CSV mode
        print(f'\n{Fore.CYAN}[CSV MODE]{Style.RESET_ALL}')
        try:
            df = pd.read_csv(args.input)
            events = []
            for _, row in df.iterrows():
                event = Event(
                    event_id=row.get('EventID', 0),
                    timestamp=datetime.strptime(f"{row.get('Date', '')} {row.get('Time', '')}", '%d/%m/%Y %H:%M:%S'),
                    account=row.get('Account', 'SYSTEM'),
                    source_ip=row.get('SourceIP', 'N/A'),
                    message=row.get('Message', ''),
                    log_channel='Security'
                )
                events.append(event)
            print(f'  [+] Loaded {len(events)} events from {args.input}\n')
        except Exception as e:
            print(f'{Fore.RED}  [-] Error loading CSV: {e}{Style.RESET_ALL}')
            return
    else:
        # Real Event Log mode
        print()  # New line
        accessible = PermissionChecker.check_log_access()
        reader = WindowsLogReader(hours=args.hours)
        events = reader.read_all_channels()

    if not events:
        print(f'{Fore.RED}[!] No events found{Style.RESET_ALL}')
        if not args.input:
            print(f'{Fore.YELLOW}[*] Try increasing timeframe: python security_analyzer.py --hours 168{Style.RESET_ALL}')
            print(f'{Fore.YELLOW}[*] Or use test data: python security_analyzer.py --input logs.csv{Style.RESET_ALL}')
        return

    # Analyze
    analyzer = SecurityAnalyzer(events)
    analyzer.analyze_all()

    # Report
    report = Report(analyzer)
    report.save_all()

    # Send to Wazuh
    if WAZUH_AVAILABLE and analyzer.alerts:
        print(f'\n{Fore.CYAN}[WAZUH INTEGRATION]{Style.RESET_ALL}')
        try:
            wazuh = WazuhIntegration()
            if wazuh.connect():
                stats = wazuh.send_alerts_batch([a.to_dict() for a in analyzer.alerts])
                print(f'  [+] Sent: {stats["sent"]} alerts')
                print(f'  [+] Local log: {stats["local"]} alerts')
            else:
                print(f'  [!] Wazuh connection unavailable - alerts logged locally')
                for alert in analyzer.alerts:
                    wazuh._log_local(alert)
                print(f'  [+] Alerts saved to: wazuh_events.jsonl')
            wazuh.disconnect()
        except Exception as e:
            print(f'  {Fore.YELLOW}[!] Wazuh error: {e}{Style.RESET_ALL}')

    print(f'\n{Fore.GREEN}[+] Analysis complete!{Style.RESET_ALL}')
    print(f'{Fore.CYAN}[+] Reports saved to: {report.output_dir}{Style.RESET_ALL}\n')


if __name__ == '__main__':
    main()
