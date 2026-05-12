"""
Wazuh Integration Module
Sends security alerts from the analyzer to Wazuh Agent
"""

import socket
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

# Import AlertLevel from security_analyzer if available
try:
    from security_analyzer import AlertLevel
except ImportError:
    AlertLevel = None


class WazuhEventLevel(Enum):
    """Wazuh alert severity levels"""
    INFO = 1
    LOW = 2
    MEDIUM = 4
    HIGH = 7
    CRITICAL = 15


class WazuhIntegration:
    """Integration with Wazuh Agent via socket"""

    def __init__(self, agent_socket: str = r'\\.\pipe\wazuh-agent-event',
                 manager_host: str = "127.0.0.1",
                 manager_port: int = 1514):
        """
        Initialize Wazuh integration.

        Args:
            agent_socket: Windows named pipe for Wazuh Agent (or TCP socket as fallback)
            manager_host: Wazuh Manager hostname/IP
            manager_port: Wazuh Manager port
        """
        self.agent_socket = agent_socket
        self.manager_host = manager_host
        self.manager_port = manager_port
        self.connected = False
        self.sock = None

    def connect(self) -> bool:
        """Connect to Wazuh Agent or Manager"""
        try:
            # Try TCP connection to Manager
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(5)
            self.sock.connect((self.manager_host, self.manager_port))
            self.connected = True
            print(f"✓ Connected to Wazuh Manager at {self.manager_host}:{self.manager_port}")
            return True
        except Exception as e:
            print(f"⚠ TCP connection failed: {e}")
            print(f"  Will attempt local file-based event logging instead")
            return False

    def disconnect(self):
        """Disconnect from Wazuh"""
        if self.sock:
            try:
                self.sock.close()
            except:
                pass
            self.connected = False

    def send_alert(self, alert: Any) -> bool:
        """
        Send an alert to Wazuh.

        Args:
            alert: Alert object or dict with keys:
                - alert_type: str (e.g., "Brute Force", "Account Takeover")
                - level: AlertLevel enum
                - details: dict with alert specifics
                - timestamp: datetime object

        Returns:
            True if sent successfully
        """
        if not self.connected and not self.connect():
            return self._log_local(alert)

        try:
            # Format event for Wazuh
            event = self._format_wazuh_event(alert)

            # Send via socket
            if self.sock:
                message = json.dumps(event) + '\n'
                self.sock.sendall(message.encode('utf-8'))
                return True

        except Exception as e:
            print(f"⚠ Failed to send to Wazuh: {e}")
            return self._log_local(alert)

        return False

    def send_alerts_batch(self, alerts: list) -> Dict[str, int]:
        """Send multiple alerts and return statistics"""
        stats = {"sent": 0, "failed": 0, "local": 0}

        for alert in alerts:
            if self.send_alert(alert):
                stats["sent"] += 1
            else:
                stats["local"] += 1

        return stats

    def _format_wazuh_event(self, alert: Any) -> Dict[str, Any]:
        """Convert analyzer alert (object or dict) to Wazuh event format"""
        # Handle both dict and object types
        if isinstance(alert, dict):
            timestamp = alert.get("timestamp", datetime.now())
            level = alert.get("level", 2)
            alert_type = alert.get("alert_type", "Security Alert")
            details = alert.get("details", {})
        else:
            # Alert object with attributes
            timestamp = getattr(alert, "timestamp", datetime.now())
            level_obj = getattr(alert, "level", None)
            if level_obj and hasattr(level_obj, "value"):
                level = level_obj.value[0] if isinstance(level_obj.value, tuple) else level_obj.value
            else:
                level = 2
            alert_type = getattr(alert, "alert_type", "Security Alert")
            details = getattr(alert, "details", {})

        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp)
            except:
                timestamp = datetime.now()

        return {
            "timestamp": timestamp.isoformat(),
            "level": level if isinstance(level, int) else 2,
            "description": alert_type,
            "data": {
                "alert_type": alert_type,
                "details": details,
                "source": "security_analyzer"
            },
            "decoder": {
                "name": "windows_security_analyzer"
            }
        }

    def _log_local(self, alert: Any) -> bool:
        """Fallback: write alert to local JSON file"""
        try:
            log_file = "wazuh_events.jsonl"
            event = self._format_wazuh_event(alert)

            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(event, default=str) + "\n")

            return True
        except Exception as e:
            return False


def integrate_with_analyzer(analyzer, wazuh_host: str = "127.0.0.1"):
    """
    Integrate SecurityAnalyzer with Wazuh.

    Usage:
        from security_analyzer import SecurityAnalyzer
        from wazuh_integration import integrate_with_analyzer

        analyzer = SecurityAnalyzer(events)
        analyzer.analyze_all()

        integrate_with_analyzer(analyzer, wazuh_host="192.168.1.100")
    """
    integration = WazuhIntegration(manager_host=wazuh_host)
    integration.connect()

    # Send all alerts
    stats = integration.send_alerts_batch([a.to_dict() for a in analyzer.alerts])

    print(f"\n[Wazuh Integration]")
    print(f"  Sent: {stats['sent']}")
    print(f"  Local log: {stats['local']}")

    integration.disconnect()

    return integration


if __name__ == "__main__":
    # Test integration
    print("Wazuh Integration Test")
    print("-" * 40)

    wazuh = WazuhIntegration()

    test_alert = {
        "alert_type": "Test Alert",
        "level": WazuhEventLevel.LOW.value,
        "details": {"test": True, "message": "Integration test"},
        "timestamp": datetime.now()
    }

    success = wazuh.send_alert(test_alert)
    print(f"\nTest result: {'✓ Success' if success else '✗ Failed (logged locally)'}")
    print(f"Check 'wazuh_events.jsonl' for local events")
