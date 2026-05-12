"""
IOC (Indicators of Compromise) Detection & SIEM Correlation
Implements best practices for threat detection and event correlation
"""

class ThreatIntelligence:
    """IOC Detection and Threat Enrichment"""

    # Suspicious patterns and known malicious indicators
    SUSPICIOUS_ACCOUNTS = {
        'admin', 'administrator', 'root', 'system', 'guest',
        'test', 'demo', 'temp', 'sa', 'postgres'
    }

    SUSPICIOUS_COMMANDS = [
        'powershell', 'cmd.exe', 'wscript', 'cscript',
        'regsvcs', 'regasm', 'msbuild', 'psexec',
        'pass', 'password', 'cred', 'token', 'secret'
    ]

    SUSPICIOUS_KEYWORDS = [
        'downloadstring', 'iex', 'invoke-expression',
        'bypass', 'obfuscate', 'encode', 'decode',
        'rundll32', 'certutil', 'bitsadmin'
    ]

    SEVERITY_MAPPING = {
        'critical': {
            'score': 100,
            'color': 'red',
            'action': 'Isolate immediately'
        },
        'high': {
            'score': 75,
            'color': 'orange',
            'action': 'Investigate within 1 hour'
        },
        'medium': {
            'score': 50,
            'color': 'yellow',
            'action': 'Review within 24 hours'
        },
        'low': {
            'score': 25,
            'color': 'blue',
            'action': 'Monitor'
        }
    }

    @staticmethod
    def extract_iocs(message: str, event_id: int) -> dict:
        """Extract IOCs from event message"""
        iocs = {
            'ips': [],
            'accounts': [],
            'commands': [],
            'domains': [],
            'hashes': [],
            'registry_keys': [],
            'file_paths': []
        }

        # Extract IPs
        import re
        ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
        iocs['ips'] = re.findall(ip_pattern, message)

        # Extract domains
        domain_pattern = r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}'
        iocs['domains'] = re.findall(domain_pattern, message, re.IGNORECASE)

        # Extract registry keys
        reg_pattern = r'HKEY_[A-Z_]+\\[^\s]+'
        iocs['registry_keys'] = re.findall(reg_pattern, message)

        # Extract file paths
        path_pattern = r'[a-z]:\\(?:[^\s:?"<>|]+\\)*[^\s:?"<>|]*'
        iocs['file_paths'] = re.findall(path_pattern, message, re.IGNORECASE)

        return iocs

    @staticmethod
    def calculate_threat_score(alert_type: str, ioc_count: int,
                               event_frequency: int) -> tuple:
        """
        Calculate threat score based on:
        - Alert type severity
        - Number of IOCs detected
        - Event frequency (correlation)
        """
        base_score = {
            'Brute Force Attack': 70,
            'Account Takeover': 95,
            'Account Manipulation': 80,
            'Suspicious Service': 75,
            'PowerShell Anomaly': 85
        }.get(alert_type, 50)

        # Increase score for multiple IOCs
        ioc_bonus = min(ioc_count * 5, 20)

        # Increase score for repeated events (correlation)
        frequency_bonus = min(event_frequency * 2, 15)

        final_score = min(base_score + ioc_bonus + frequency_bonus, 100)

        # Determine severity level
        if final_score >= 85:
            severity = 'CRITICAL'
        elif final_score >= 70:
            severity = 'HIGH'
        elif final_score >= 50:
            severity = 'MEDIUM'
        else:
            severity = 'LOW'

        return final_score, severity

    @staticmethod
    def generate_threat_context(alert_type: str, details: dict) -> str:
        """Generate detailed threat context based on alert type"""

        contexts = {
            'Brute Force Attack': (
                f"Múltiplas tentativas de login falhadas detectadas:\n"
                f"- IP Atacante: {details.get('source_ip', 'Desconhecido')}\n"
                f"- Tentativas: {details.get('attempt_count', 'N/A')}\n"
                f"- Período: {details.get('time_window', 'N/A')}\n"
                f"- Contas Alvo: {details.get('target_accounts', 'Múltiplas')}\n"
                f"- Risco: IP pode estar em lista negra ou ser malicioso"
            ),
            'Account Takeover': (
                f"Sequência suspeita de eventos detectada:\n"
                f"- Conta: {details.get('account', 'Desconhecida')}\n"
                f"- IP do Ataque: {details.get('source_ip', 'N/A')}\n"
                f"- Tempo entre falhas e sucesso: {details.get('breach_time', 'N/A')}\n"
                f"- Risco CRÍTICO: Conta pode estar comprometida"
            ),
            'Account Manipulation': (
                f"Alteração não autorizada de conta detectada:\n"
                f"- Tipo de Mudança: {details.get('change_type', 'N/A')}\n"
                f"- Conta Afetada: {details.get('account', 'N/A')}\n"
                f"- Hora: {details.get('timestamp', 'N/A')}\n"
                f"- Risco: Possível escalação de privilégios"
            ),
            'Suspicious Service': (
                f"Serviço suspeito instalado:\n"
                f"- Serviço: {details.get('service_name', 'Desconhecido')}\n"
                f"- Executável: {details.get('executable', 'N/A')}\n"
                f"- Descrição: {details.get('description', 'N/A')}\n"
                f"- Risco: Possível persistência de malware"
            ),
            'PowerShell Anomaly': (
                f"Atividade suspeita do PowerShell detectada:\n"
                f"- Comando: {details.get('command', 'N/A')[:100]}...\n"
                f"- Tipo: {details.get('script_type', 'N/A')}\n"
                f"- Usuário: {details.get('user', 'N/A')}\n"
                f"- Risco: Possível execução de malware ou ferramentas de ataque"
            )
        }

        return contexts.get(alert_type, f"Alerta: {alert_type}")

    @staticmethod
    def get_remediation_steps(alert_type: str) -> list:
        """Get SIEM-recommended remediation steps"""

        steps = {
            'Brute Force Attack': [
                '1. Bloquear IP atacante no firewall imediatamente',
                '2. Auditar tentativas de login bem-sucedidas neste período',
                '3. Forçar mudança de password para contas afetadas',
                '4. Ativar MFA para todas as contas',
                '5. Monitorar este IP para futuro ataque'
            ],
            'Account Takeover': [
                '1. ISOLAR CONTA IMEDIATAMENTE do acesso à rede',
                '2. Forçar logout de todas as sessões ativas',
                '3. Redefini password com complexidade máxima',
                '4. Auditar todas as ações desta conta nos últimos 24 horas',
                '5. Bloquear IP atacante globalmente',
                '6. Notificar utilizador de potencial comprometimento'
            ],
            'Account Manipulation': [
                '1. Reverter alterações não autorizadas imediatamente',
                '2. Auditar quem fez a alteração',
                '3. Ativar auditoria para esta conta',
                '4. Investigar motivação (escalação de privilégios?)',
                '5. Documentar incidente para compliance'
            ],
            'Suspicious Service': [
                '1. Remover serviço suspeito',
                '2. Analisar executável em sandbox/VirusTotal',
                '3. Procurar serviços semelhantes em outras máquinas',
                '4. Verificar logs do sistema para origem da instalação',
                '5. Restaurar de backup limpo se infectado'
            ],
            'PowerShell Anomaly': [
                '1. Bloquear execução do script',
                '2. Analisar script completo para IOCs',
                '3. Investigar intent (ransomware? roubo de dados?)',
                '4. Verificar se há execução bem-sucedida anterior',
                '5. Reforçar políticas de PowerShell (sem bypass, ASR rules)'
            ]
        }

        return steps.get(alert_type, ['Investigar manualmente'])
