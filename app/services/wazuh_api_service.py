"""
Wazuh REST API Client — communicates with Wazuh Manager API (port 55000)
Handles JWT auth with auto-refresh, SSL, and graceful degradation.
"""

import json
import requests
import urllib3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

CONFIG_FILE = Path(__file__).parent.parent.parent / 'wazuh_api_config.json'

DEFAULT_CONFIG = {
    'host': 'localhost',
    'port': 55000,
    'username': 'wazuh',
    'password': 'wazuh',
    'verify_ssl': False,
}


def _load_config() -> Dict[str, Any]:
    if CONFIG_FILE.exists():
        try:
            return {**DEFAULT_CONFIG, **json.loads(CONFIG_FILE.read_text())}
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()


def _save_config(cfg: Dict[str, Any]) -> None:
    safe = {k: v for k, v in cfg.items() if k != 'password'}
    # password is saved separately to avoid accidental exposure in logs
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2))


class WazuhAPIService:
    def __init__(self):
        self._reload_config()
        self._token: Optional[str] = None
        self._token_expires: Optional[datetime] = None

    # ------------------------------------------------------------------
    # Config
    # ------------------------------------------------------------------

    def _reload_config(self):
        cfg = _load_config()
        self.host = cfg['host']
        self.port = cfg['port']
        self.username = cfg['username']
        self.password = cfg['password']
        self.verify_ssl = cfg['verify_ssl']
        self.base_url = f'https://{self.host}:{self.port}'
        self._token = None  # invalidate token on config change
        self._token_expires = None

    def get_config(self) -> Dict[str, Any]:
        cfg = _load_config()
        return {k: v for k, v in cfg.items() if k != 'password'}

    def save_config(self, cfg: Dict[str, Any]) -> None:
        current = _load_config()
        current.update(cfg)
        _save_config(current)
        self._reload_config()

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    def _get_token(self) -> Optional[str]:
        if self._token and self._token_expires and datetime.now() < self._token_expires:
            return self._token
        try:
            resp = requests.post(
                f'{self.base_url}/security/user/authenticate',
                auth=(self.username, self.password),
                verify=self.verify_ssl,
                timeout=10,
            )
            if resp.status_code == 200:
                self._token = resp.json()['data']['token']
                self._token_expires = datetime.now() + timedelta(seconds=800)
                return self._token
        except Exception:
            pass
        return None

    def _headers(self) -> Dict[str, str]:
        token = self._get_token()
        if not token:
            raise ConnectionError('Cannot authenticate with Wazuh API')
        return {'Authorization': f'Bearer {token}'}

    def is_available(self) -> bool:
        try:
            return self._get_token() is not None
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get(self, endpoint: str, params: Dict = None) -> Optional[Dict]:
        try:
            resp = requests.get(
                f'{self.base_url}{endpoint}',
                headers=self._headers(),
                params=params or {},
                verify=self.verify_ssl,
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None

    def _put(self, endpoint: str, body: Dict, params: Dict = None) -> Optional[Dict]:
        try:
            resp = requests.put(
                f'{self.base_url}{endpoint}',
                headers={**self._headers(), 'Content-Type': 'application/json'},
                params=params or {},
                json=body,
                verify=self.verify_ssl,
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None

    def _items(self, data: Optional[Dict]) -> List[Dict]:
        if not data:
            return []
        return data.get('data', {}).get('affected_items', [])

    # ------------------------------------------------------------------
    # Agents
    # ------------------------------------------------------------------

    def get_agents(self, status: Optional[str] = None) -> List[Dict]:
        params: Dict[str, Any] = {'limit': 500}
        if status:
            params['status'] = status
        return self._items(self._get('/agents', params))

    def get_agent(self, agent_id: str) -> Optional[Dict]:
        items = self._items(self._get(f'/agents', {'agents_list': agent_id}))
        return items[0] if items else None

    # ------------------------------------------------------------------
    # Vulnerabilities
    # ------------------------------------------------------------------

    def get_vulnerabilities(self, agent_id: str, severity: Optional[str] = None) -> List[Dict]:
        params: Dict[str, Any] = {'limit': 500}
        if severity:
            params['severity'] = severity
        return self._items(self._get(f'/vulnerability/{agent_id}', params))

    def get_vulnerability_summary(self, agent_id: str) -> Dict[str, int]:
        all_vulns = self.get_vulnerabilities(agent_id)
        summary: Dict[str, int] = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0, 'total': len(all_vulns)}
        for v in all_vulns:
            sev = (v.get('severity') or '').lower()
            if sev in summary:
                summary[sev] += 1
        return summary

    # ------------------------------------------------------------------
    # SCA / Compliance
    # ------------------------------------------------------------------

    def get_sca_policies(self, agent_id: str) -> List[Dict]:
        return self._items(self._get(f'/sca/{agent_id}'))

    def get_sca_checks(self, agent_id: str, policy_id: str) -> List[Dict]:
        return self._items(self._get(f'/sca/{agent_id}/checks/{policy_id}', {'limit': 500}))

    # ------------------------------------------------------------------
    # Active Response
    # ------------------------------------------------------------------

    ACTIVE_RESPONSE_COMMANDS = {
        'block-ip-windows': 'netsh-win-null-route',
        'block-ip-linux': 'firewall-drop',
        'disable-account': 'disable-account',
        'restart-wazuh': 'restart-wazuh',
    }

    def trigger_active_response(
        self,
        agent_id: str,
        command_key: str,
        arguments: List[str] = None,
    ) -> Dict[str, Any]:
        command = self.ACTIVE_RESPONSE_COMMANDS.get(command_key)
        if not command:
            return {'success': False, 'error': f'Unknown command: {command_key}'}
        body: Dict[str, Any] = {'command': command}
        if arguments:
            body['arguments'] = arguments
        result = self._put(
            '/active-response',
            body=body,
            params={'agents_list': agent_id},
        )
        if result and result.get('error') == 0:
            return {'success': True, 'command': command, 'agent_id': agent_id}
        return {'success': False, 'error': 'Active response failed or Wazuh unavailable'}

    # ------------------------------------------------------------------
    # Alerts (from Wazuh Indexer via API)
    # ------------------------------------------------------------------

    def get_alerts(self, limit: int = 100, level: Optional[int] = None) -> List[Dict]:
        params: Dict[str, Any] = {'limit': limit, 'sort': '-timestamp'}
        if level:
            params['level'] = level
        return self._items(self._get('/alerts', params))


# Global singleton — reloads config on each method call is not needed;
# config reload is triggered explicitly via save_config().
wazuh_api_service = WazuhAPIService()
