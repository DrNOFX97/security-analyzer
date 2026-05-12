"""
Advanced Log Parsing and Field Extraction
Implements SIEM best practices for log structure analysis
"""

from datetime import datetime
import re
from typing import Dict, List, Tuple

class LogParser:
    """Parse structured and unstructured logs with field extraction"""

    # Standard log fields all SIEM systems track
    REQUIRED_FIELDS = ['timestamp', 'hostname', 'severity', 'message']
    OPTIONAL_FIELDS = ['process', 'source_ip', 'dest_ip', 'port', 'action', 'user', 'status']

    # Severity levels (normalized)
    SEVERITY_LEVELS = {
        'CRITICAL': 5, 'ERROR': 4, 'WARN': 3, 'WARNING': 3,
        'INFO': 2, 'INFORMATION': 2, 'DEBUG': 1, 'TRACE': 0
    }

    # Common Windows Event IDs and their patterns
    EVENT_PATTERNS = {
        4625: {  # Failed logon
            'name': 'Logon Falhou',
            'severity': 'WARN',
            'fields_to_extract': ['source_ip', 'user', 'reason'],
            'pattern': r'Logon Type:\s*(\d+)|Source Network Address:\s*([\d.]+)|Account Name:\s*(\S+)'
        },
        4624: {  # Successful logon
            'name': 'Logon Bem-sucedido',
            'severity': 'INFO',
            'fields_to_extract': ['source_ip', 'user', 'logon_type'],
            'pattern': r'Source Network Address:\s*([\d.]+)|Account Name:\s*(\S+)|Logon Type:\s*(\d+)'
        },
        4720: {  # User account created
            'name': 'Conta Criada',
            'severity': 'WARN',
            'fields_to_extract': ['user'],
            'pattern': r'New Account Name:\s*(\S+)|Account Name:\s*(\S+)'
        },
        4728: {  # User added to group
            'name': 'Utilizador Adicionado ao Grupo',
            'severity': 'WARN',
            'fields_to_extract': ['user', 'group'],
            'pattern': r'Member Name:\s*(\S+)|Group Name:\s*(\S+)'
        },
        7045: {  # Service installed
            'name': 'Serviço Instalado',
            'severity': 'WARN',
            'fields_to_extract': ['service_name', 'executable'],
            'pattern': r'Service Name:\s*(\S+)|Image Path:\s*([^\n]+)'
        },
        4104: {  # PowerShell script block
            'name': 'Bloco de Script PowerShell',
            'severity': 'WARN',
            'fields_to_extract': ['script', 'user'],
            'pattern': r'ScriptBlock Text:\s*(.+?)(?=\n\n|\Z)'
        }
    }

    @staticmethod
    def parse_log_line(line: str) -> Dict:
        """Parse a single log line into structured fields"""

        parsed = {
            'raw': line,
            'timestamp': None,
            'hostname': None,
            'severity': 'INFO',
            'process': None,
            'message': None,
            'source_ip': None,
            'dest_ip': None,
            'port': None,
            'action': None,
            'user': None,
            'status': None
        }

        # Extract timestamp (ISO format)
        ts_match = re.search(r'(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})', line)
        if ts_match:
            try:
                parsed['timestamp'] = datetime.fromisoformat(ts_match.group(1).replace(' ', 'T'))
            except:
                pass

        # Extract hostname (usually after timestamp)
        hostname_match = re.search(r'\s([a-zA-Z0-9_-]+)\s', line)
        if hostname_match:
            parsed['hostname'] = hostname_match.group(1)

        # Extract severity (case insensitive)
        severity_match = re.search(r'\[(ERROR|CRITICAL|WARN|WARNING|INFO|DEBUG)\]', line, re.IGNORECASE)
        if severity_match:
            severity = severity_match.group(1).upper()
            parsed['severity'] = severity

        # Extract process name (usually in brackets or before colon)
        process_match = re.search(r'\[([^\]]+)\]', line)
        if process_match:
            parsed['process'] = process_match.group(1)

        # Extract IPs (source and first dest)
        ip_pattern = r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        ips = re.findall(ip_pattern, line)
        if len(ips) > 0:
            parsed['source_ip'] = ips[0]
        if len(ips) > 1:
            parsed['dest_ip'] = ips[1]

        # Extract port
        port_match = re.search(r'port\s+(\d+)|:(\d{4,5})\s', line, re.IGNORECASE)
        if port_match:
            parsed['port'] = port_match.group(1) or port_match.group(2)

        # Extract action (allowed, denied, blocked, failed, succeeded)
        action_match = re.search(r'(allowed|denied|blocked|failed|succeeded|connected|disconnected)', line, re.IGNORECASE)
        if action_match:
            parsed['action'] = action_match.group(1).lower()

        # Extract user (usuário, user, username)
        user_match = re.search(r'(?:user|utilizador|account)[\s=:]+([^\s\[\]]+)', line, re.IGNORECASE)
        if user_match:
            parsed['user'] = user_match.group(1)

        # Extract status (success, failure, error)
        status_match = re.search(r'(success|failure|error|timeout)', line, re.IGNORECASE)
        if status_match:
            parsed['status'] = status_match.group(1).lower()

        # Full message is the rest
        parsed['message'] = line

        return parsed

    @staticmethod
    def correlate_events(events: List[Dict]) -> List[Dict]:
        """Correlate events by timestamp and source IP for timeline analysis"""

        if not events:
            return []

        # Sort by timestamp
        sorted_events = sorted(events, key=lambda x: x.get('timestamp') or datetime.now())

        # Group by source IP and timestamp window (5 min)
        correlations = {}
        for event in sorted_events:
            source = event.get('source_ip', 'UNKNOWN')
            ts = event.get('timestamp')

            if source not in correlations:
                correlations[source] = []

            correlations[source].append(event)

        # Analyze correlations
        correlated = []
        for source_ip, source_events in correlations.items():
            if len(source_events) > 1:
                # Multiple events from same source = suspicious
                time_diff = (source_events[-1].get('timestamp') or datetime.now()) - \
                            (source_events[0].get('timestamp') or datetime.now())

                correlation = {
                    'source_ip': source_ip,
                    'event_count': len(source_events),
                    'time_span': str(time_diff),
                    'severity': 'HIGH' if len(source_events) > 5 else 'MEDIUM',
                    'events': source_events,
                    'pattern': LogParser.detect_attack_pattern(source_events)
                }
                correlated.append(correlation)

        return correlated

    @staticmethod
    def detect_attack_pattern(events: List[Dict]) -> str:
        """Detect attack patterns from event sequence"""

        actions = [str(e.get('action', '') or '').lower() for e in events]
        statuses = [str(e.get('status', '') or '').lower() for e in events]

        # Brute force: múltiplas falhas
        failed_count = len([s for s in statuses if 'fail' in s])
        if failed_count >= 3:
            return 'Força Bruta Detectada'

        # Privilege escalation: falha seguida de sucesso
        has_failure = any('fail' in s for s in statuses)
        has_success = any('success' in s for s in statuses)
        if has_failure and has_success:
            return 'Possível Escalação de Privilégios'

        # Port scanning: múltiplos IPs com portos diferentes
        if len(set(e.get('port') for e in events)) > 3:
            return 'Possível Varredura de Portos'

        # Data exfiltration: conexões saintes suspeitas
        if any('connected' in a for a in actions):
            return 'Possível Transferência de Dados'

        return 'Padrão Suspeito'

    @staticmethod
    def create_timeline(events: List[Dict]) -> str:
        """Create human-readable timeline of events"""

        sorted_events = sorted(events, key=lambda x: x.get('timestamp') or datetime.now())

        timeline = "📋 TIMELINE DOS EVENTOS:\n"
        timeline += "=" * 80 + "\n"

        for i, event in enumerate(sorted_events, 1):
            ts = event.get('timestamp', 'N/A')
            hostname = event.get('hostname', 'UNKNOWN')
            severity = event.get('severity', 'INFO')
            action = event.get('action', 'N/A')
            source = event.get('source_ip', 'UNKNOWN')
            user = event.get('user', 'UNKNOWN')

            icon = {
                'CRITICAL': '🚨',
                'ERROR': '❌',
                'WARN': '⚠️',
                'INFO': 'ℹ️'
            }.get(severity, '?')

            timeline += f"{i:2}. {icon} [{ts}] {hostname}\n"
            timeline += f"    ├─ Origem: {source}\n"
            timeline += f"    ├─ Utilizador: {user}\n"
            timeline += f"    ├─ Ação: {action}\n"
            timeline += f"    └─ Severity: {severity}\n"

        return timeline

    @staticmethod
    def summarize_iocs_by_field(events: List[Dict]) -> Dict[str, List]:
        """Summarize all IOCs grouped by field for fast pivot analysis"""

        summary = {
            'source_ips': [],
            'dest_ips': [],
            'ports': [],
            'users': [],
            'hostnames': [],
            'processes': [],
            'actions': []
        }

        for event in events:
            if event.get('source_ip'):
                summary['source_ips'].append(event['source_ip'])
            if event.get('dest_ip'):
                summary['dest_ips'].append(event['dest_ip'])
            if event.get('port'):
                summary['ports'].append(event['port'])
            if event.get('user'):
                summary['users'].append(event['user'])
            if event.get('hostname'):
                summary['hostnames'].append(event['hostname'])
            if event.get('process'):
                summary['processes'].append(event['process'])
            if event.get('action'):
                summary['actions'].append(event['action'])

        # Remove duplicates and count
        for key in summary:
            summary[key] = list(set(summary[key]))

        return summary
