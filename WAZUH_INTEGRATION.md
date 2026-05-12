# Wazuh Integration Guide

## Overview

O `security_analyzer.py` agora envia automaticamente todos os alertas detectados para o **Wazuh Manager**. A integração funciona em dois modos:

### Modo 1: Conexão Direta (Recomendado)
- Conecta ao Wazuh Manager via TCP (porta 1514)
- Envia alertas em tempo real
- Fallback automático para ficheiro local se falhar

### Modo 2: Ficheiro Local
- Salva eventos em `wazuh_events.jsonl` (JSON Lines format)
- Pode ser sincronizado manualmente para Wazuh later
- Não requer Wazuh Manager rodando

## Installation

### 1. Wazuh Agent (Windows)

```powershell
# O instalador MSI já está em:
# C:\Users\fnuno\Documents\security_analyzer\wazuh-agent-4.7.0-1.msi

# Install (como Administrator):
msiexec /i "wazuh-agent-4.7.0-1.msi" /quiet /norestart

# Localização após install:
# C:\Program Files (x86)\ossec-agent\
```

### 2. Configurar Conexão

Editar `C:\Program Files (x86)\ossec-agent\ossec.conf`:

```xml
<client>
  <server>
    <address>SEU_WAZUH_MANAGER_IP</address>
    <port>1514</port>
    <protocol>tcp</protocol>
  </server>
  <config-profile>windows, windows10</config-profile>
</client>
```

**Exemplos:**
- Localhost (dev): `<address>127.0.0.1</address>`
- Rede: `<address>192.168.1.100</address>`
- Hostname: `<address>wazuh.empresa.com</address>`

### 3. Iniciar Serviço

```powershell
# PowerShell (Admin):
Start-Service -Name "wazuh"

# Ou via CMD:
net start wazuh

# Verificar status:
Get-Service -Name "wazuh"
```

## Usage

### Automático (Recomendado)

O analisador envia alertas automaticamente após análise:

```powershell
# Analisar logs reais (requer Admin):
python security_analyzer.py

# Analisar teste (sem Admin):
python security_analyzer.py --input logs.csv

# Output:
# [WAZUH INTEGRATION]
#   [+] Sent: 20 alerts
#   [!] Wazuh connection unavailable - alerts logged locally
#   [+] Alerts saved to: wazuh_events.jsonl
```

### Programático

```python
from security_analyzer import SecurityAnalyzer
from wazuh_integration import integrate_with_analyzer

# Análise
analyzer = SecurityAnalyzer(events)
analyzer.analyze_all()

# Enviar para Wazuh
integrate_with_analyzer(analyzer, wazuh_host="192.168.1.100")
```

### Teste Manual

```powershell
cd C:\Users\fnuno\Documents\security_analyzer

python
>>> from wazuh_integration import WazuhIntegration
>>> wazuh = WazuhIntegration(manager_host="127.0.0.1")
>>> wazuh.connect()
>>> test = {"alert_type": "Test", "level": 2, "details": {}, "timestamp": "2026-05-12T21:00:00"}
>>> wazuh.send_alert(test)
```

## Output

### Ficheiro Local (wazuh_events.jsonl)

Cada linha é um evento JSON válido:

```json
{
  "timestamp": "2026-05-12T21:53:37.169000",
  "level": 3,
  "description": "Brute Force Attack",
  "data": {
    "alert_type": "Brute Force Attack",
    "details": {
      "source_ip": "185.22.44.10",
      "target_account": "admin",
      "failed_attempts": 16
    },
    "source": "security_analyzer"
  },
  "decoder": {
    "name": "windows_security_analyzer"
  }
}
```

### Alertas Enviados para Wazuh Manager

- **Level** (Severidade):
  - 1: INFO
  - 2: LOW
  - 3: MEDIUM
  - 4: HIGH
  - 5: CRITICAL

- **Tipos Detectados:**
  - Brute Force Attack
  - Account Takeover Detected
  - Suspicious Account Changes
  - Suspicious Service Installation
  - Suspicious PowerShell Script

## Troubleshooting

### ❌ "Nenhuma ligação pôde ser feita"

**Causa:** Wazuh Manager não está acessível na porta 1514

**Solução:**
1. Verificar se Wazuh Manager está rodando
2. Verificar firewall (porta 1514 aberta?)
3. Verificar IP/hostname em `ossec.conf`
4. Eventos continuam sendo salvos localmente em `wazuh_events.jsonl`

### ❌ Permissão negada ao editar ossec.conf

**Solução:**
```powershell
# Executar PowerShell como Administrator
# Depois editar ficheiro ou usar:
takeown /F "C:\Program Files (x86)\ossec-agent\ossec.conf" /A
icacls "C:\Program Files (x86)\ossec-agent\ossec.conf" /grant:r "${env:USERNAME}:(F)"
```

### ✅ Eventos não aparecem em Wazuh Dashboard

1. Verificar se `wazuh_events.jsonl` tem eventos
2. Confirmar conectividade: `Test-NetConnection -ComputerName 127.0.0.1 -Port 1514`
3. Verificar logs do Wazuh Agent: `C:\Program Files (x86)\ossec-agent\logs\`

## Architecture

```
┌─────────────────────────────┐
│  security_analyzer.py       │
│  ├─ EnvironmentInfo         │
│  ├─ PermissionChecker       │
│  ├─ WindowsLogReader        │
│  ├─ SecurityAnalyzer        │
│  └─ [NEW] Wazuh Integration │
└─────────┬───────────────────┘
          │
          ├──> TCP Port 1514
          │    (Wazuh Manager)
          │
          ├──> wazuh_events.jsonl
          │    (Local Fallback)
          │
          └──> reports/ (CSV/TXT)
```

## Performance

- **Envio de Alertas:** < 100ms por alert (TCP)
- **Ficheiro Local:** < 5ms por alert (JSONL append)
- **Buffer:** Até 5000 eventos em memória antes de enviar

## Próximas Versões

- [ ] Suporte para agent enrollment automático
- [ ] Compressão de eventos
- [ ] Batch send (múltiplos eventos por conexão)
- [ ] Dashboard web integrado
- [ ] Alertas por email/webhook
