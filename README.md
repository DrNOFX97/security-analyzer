# 🛡️ Windows Security Log Analyzer v2.0

[![GitHub Release](https://img.shields.io/github/v/release/DrNOFX97/security-analyzer?style=flat-square)](https://github.com/DrNOFX97/security-analyzer/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![React 18+](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-green.svg)](https://DrNOFX97.github.io/security-analyzer/)

Uma ferramenta profissional de análise de segurança que lê registos reais do Windows Event Log e realiza detecção avançada de ameaças com práticas SIEM. Inclui extração de IOC (Indicators of Compromise), pontuação de ameaças, correlação de eventos e inteligência de ameaças contextual em português.

---

## 🎯 Características Principais

### 🔍 Detecção de Ameaças Avançada
- **Brute Force Attacks** - Múltiplas tentativas de login falhadas
- **Account Takeover** - Sequência de falha → sucesso em <5 minutos
- **Account Manipulation** - Criação/modificação suspeita de contas
- **Suspicious Services** - Instalação de serviços maliciosos
- **PowerShell Anomalies** - Scripts suspeitos com keywords maliciosas
- **Multi-Event Correlation** - Detecção de padrões de ataque em sequência

### 🎓 Inteligência de Ameaças (SIEM Best Practices)
- **IOC Extraction** - Extração automática de:
  - Endereços IP (fonte/destino)
  - Domínios e URLs
  - Caminhos de ficheiros
  - Chaves de registo
  - Hashes e comandos
- **Threat Scoring** - Pontuação 0-100 baseada em:
  - Tipo de alerta (baseline)
  - Contagem de IOCs (+5 cada)
  - Frequência de eventos (+2 cada)
- **Threat Context** - Explicações detalhadas em PT-PT
- **Remediation Steps** - Passos recomendados para mitigação

### 📊 Dashboard Web Moderno
- **Real-time Analysis** - Server-Sent Events (SSE) para progresso em tempo real
- **Interactive Charts** - Timeline e distribuição de gravidade com Recharts
- **Alert Filtering** - Por gravidade, tipo de alerta, busca full-text
- **Pagination** - Suporte para milhares de alertas
- **System Information** - Hostname, IP, user, domain, admin status
- **Portuguese UI** - Totalmente localizado em PT-PT

### ⚙️ Backend Robusto
- **FastAPI** - Framework web rápido e moderno
- **Cross-Platform** - Windows (Event Logs) + CSV fallback
- **Async Processing** - Análise não-bloqueante com asyncio
- **Wazuh Integration** - Envio automático de alertas para SIEM
- **Type Safety** - Pydantic models com validação completa

---

## 📋 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│ React Frontend (TypeScript + Tailwind)                      │
│ - Dashboard, Alerts, Settings                               │
│ - Zustand state management                                  │
│ - Recharts visualizations                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ REST API (JSON)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ FastAPI Backend                                             │
│ - /api/system/info - Info do sistema                       │
│ - /api/analysis/run - Inicia análise                       │
│ - /api/analysis/stream - SSE com progresso                 │
│ - /api/events - Alertas paginados com filtros              │
│ - /api/events/summary - Timeline e distribuição            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  SecurityAnalyzer Engine    │
        │  - IOC Extraction           │
        │  - Threat Scoring           │
        │  - Event Correlation        │
        │  - SIEM Processing          │
        └─────────────────────────────┘
```

---

## 🚀 Quick Start

### Pré-requisitos
- **Windows 10/11** (Event Log reading)
- **Python 3.8+**
- **Node.js 18+**
- **Administrator privileges** (para ler Security Event Log)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/DrNOFX97/security-analyzer.git
cd security-analyzer

# 2. Instala dependências Python
pip install -r requirements.txt

# 3. Instala dependências frontend
cd frontend && npm install && cd ..

# 4. Build do frontend
cd frontend && npm run build && cd ..
```

### Execução

#### Opção 1: Dashboard Web (Recomendado)

```bash
# Terminal 1 - Backend (com privilégios Admin)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend (em desenvolvimento)
cd frontend && npm run dev
# Abre: http://localhost:5173

# Ou em produção:
# Backend serve automaticamente o frontend em http://localhost:8000
```

#### Opção 2: CLI Analyzer (Legacy)

```bash
# Com dados CSV (sem Admin required)
python security_analyzer.py --input logs.csv

# Com Windows Event Logs (Admin required)
python security_analyzer.py

# Timeframe customizado
python security_analyzer.py --hours 168
```

---

## 📊 Threat Intelligence

### Algoritmo de Pontuação de Ameaças

```
Threat Score = Base Score + IOC Bonus + Frequency Bonus
              └─ 0-100 ────┘

Base Score:
  • Account Takeover: 95
  • Brute Force: 70
  • PowerShell Anomaly: 85
  • Suspicious Service: 75
  • Account Manipulation: 80

Bonuses:
  • IOC Count: +5 per IOC (capped at +20)
  • Event Frequency: +2 per event (capped at +15)

Severity Levels:
  • CRITICAL: 85-100
  • HIGH: 70-84
  • MEDIUM: 50-69
  • LOW: 0-49
```

### Indicadores de Compromisso (IOCs)

Extração automática de:
- **IPs** - `192.168.1.100`, `10.0.0.1`
- **Domínios** - `example.com`, `malware.com`
- **File Paths** - `C:\Windows\System32\evil.exe`
- **Registry Keys** - `HKEY_LOCAL_MACHINE\Software\...`
- **Hashes** - MD5, SHA1, SHA256
- **Comandos** - PowerShell, cmd.exe invocations

---

## 🔗 API Documentation

### GET /api/system/info
Informações do sistema

```bash
curl http://localhost:8000/api/system/info
```

**Response:**
```json
{
  "hostname": "PC-Vicente",
  "platform": "windows",
  "is_admin": true,
  "ip_address": "192.168.1.126",
  "current_user": "fnuno",
  "domain": "WORKGROUP"
}
```

### POST /api/analysis/run
Inicia análise de segurança

```bash
curl -X POST http://localhost:8000/api/analysis/run \
  -H "Content-Type: application/json" \
  -d '{
    "source": "csv",
    "csv_path": "logs.csv",
    "hours": 24
  }'
```

### GET /api/events/alerts
Alertas paginados com filtros

```bash
curl 'http://localhost:8000/api/events/alerts?page=1&per_page=25&level=CRITICAL'
```

**Response:**
```json
{
  "total": 20,
  "page": 1,
  "per_page": 25,
  "items": [
    {
      "id": "account-takeover-0",
      "level": "CRITICAL",
      "threat_score": 99,
      "severity_level": "CRITICAL",
      "alert_type": "Account Takeover",
      "iocs": {
        "ips": ["185.22.44.10"],
        "accounts": ["admin"]
      },
      "context": "Sequência suspeita de eventos detectada...",
      "remediation": ["1. ISOLAR CONTA IMEDIATAMENTE...", "2. ..."]
    }
  ]
}
```

### GET /api/events/summary/timeline
Timeline de alertas por hora

```bash
curl 'http://localhost:8000/api/events/summary/timeline?bucket=hour'
```

---

## 📈 Exemplo de Alerta

Alerta com inteligência de ameaças completa:

```json
{
  "alert_type": "Brute Force Attack",
  "threat_score": 85,
  "severity_level": "CRITICAL",
  "details": {
    "source_ip": "185.22.44.10",
    "target_account": "admin",
    "failed_attempts": 16,
    "first_attempt": "2026-01-14 02:14:10",
    "last_attempt": "2026-01-14 02:15:25"
  },
  "iocs": {
    "ips": ["185.22.44.10"],
    "accounts": ["admin"]
  },
  "context": "Múltiplas tentativas de login falhadas detectadas:\n- IP Atacante: 185.22.44.10\n- Tentativas: 16\n- Risco: IP pode estar em lista negra ou ser malicioso",
  "remediation": [
    "1. Bloquear IP atacante no firewall imediatamente",
    "2. Auditar tentativas de login bem-sucedidas neste período",
    "3. Forçar mudança de password para contas afetadas",
    "4. Ativar MFA para todas as contas",
    "5. Monitorar este IP para futuro ataque"
  ]
}
```

---

## 🔐 Wazuh Integration

Alertas são automaticamente enviados para Wazuh Manager (SIEM):

```bash
# Configure em: ossec.conf
<server-ip>127.0.0.1</server-ip>
<server-port>1514</server-port>

# Se Wazuh indisponível, eventos guardados em:
wazuh_events.jsonl
```

---

## 📁 Estrutura do Projeto

```
security-analyzer/
├── security_analyzer.py          # Motor de análise principal
├── threat_intelligence.py        # IOC extraction & threat scoring
├── log_parser.py                 # Field extraction & correlation
├── wazuh_integration.py          # Integração SIEM
│
├── app/                          # FastAPI Backend
│   ├── main.py                   # App factory
│   ├── routers/                  # API endpoints
│   ├── services/                 # Business logic
│   └── schemas/                  # Pydantic models
│
├── frontend/                     # React Dashboard
│   ├── src/
│   │   ├── pages/               # Dashboard, Alerts, Settings
│   │   ├── components/          # UI components
│   │   ├── hooks/               # React custom hooks
│   │   └── store/               # Zustand state
│   └── dist/                    # Built SPA (production)
│
├── reports/                      # Análise output (auto-created)
├── requirements.txt              # Python dependencies
└── CLAUDE.md                     # Developer documentation
```

---

## 🛠️ Desenvolvimento

### Backend Changes
```bash
# 1. Edit detection logic
vim security_analyzer.py

# 2. Changes auto-reload with --reload flag
python -m uvicorn app.main:app --reload

# 3. Test API
curl http://localhost:8000/api/analysis/latest
```

### Frontend Changes
```bash
# 1. Edit React components
vim frontend/src/pages/AlertsPage.tsx

# 2. Hot reload automatic
cd frontend && npm run dev

# 3. Build for production
npm run build  # Output: frontend/dist/
```

---

## 📊 Event ID Reference

| Event ID | Descrição | Análise |
|----------|-----------|--------|
| 4625 | Failed Logon | Brute force detection |
| 4624 | Successful Logon | Account takeover (after 4625) |
| 4720 | User Account Created | Suspicious account creation |
| 4728 | User Added to Group | Privilege escalation |
| 7045 | New Service Installed | Malware persistence |
| 4104 | PowerShell Script Block | Malicious scripts |
| 4103 | PowerShell Module Logging | Script analysis |

---

## 🐛 Troubleshooting

### "Admin privileges required"
```bash
# Run with Administrator PowerShell:
Run-As-Administrator
python security_analyzer.py
```

### Port 8000 already in use
```bash
# Use different port:
python -m uvicorn app.main:app --port 8001
```

### Event Log not accessible
```bash
# Verify access manually:
Get-WinEvent -LogName Security -MaxEvents 5
```

### Frontend not building
```bash
# Clear cache and reinstall
cd frontend
rm -r node_modules package-lock.json
npm install
npm run build
```

---

## 📝 Licença

MIT License - vê [LICENSE](LICENSE) para detalhes.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Cria uma branch (`git checkout -b feature/amazing-feature`)
3. Commit as alterações (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abre um Pull Request

---

## 📧 Contacto & Suporte

- **GitHub Issues** - [Reporta bugs](https://github.com/DrNOFX97/security-analyzer/issues)
- **Discussions** - [Discussões e ideias](https://github.com/DrNOFX97/security-analyzer/discussions)

---

## 🔄 Roadmap

- [ ] Auto-enrollment de Wazuh agents
- [ ] Exportar para formato STIX/TAXII
- [ ] Machine Learning para detecção de anomalias
- [ ] Suporte multi-máquina (agregação SIEM)
- [ ] Clustering de alertas por origem
- [ ] Dashboard móvel (responsivo)
- [ ] Webhooks customizados

---

**⭐ Se o projeto foi útil, deixa uma star!**

---

<div align="center">

Desenvolvido com ❤️ para segurança Windows

[🌐 Dashboard Online](https://DrNOFX97.github.io/security-analyzer/) | [📖 Documentação](./CLAUDE.md) | [🐛 Reportar Issue](https://github.com/DrNOFX97/security-analyzer/issues)

</div>
