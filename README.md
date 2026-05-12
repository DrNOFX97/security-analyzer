# Windows Security Log Analyzer v2.0

Ferramenta profissional de análise de segurança que lê **logs reais do Windows Event Log** automaticamente.

## Novidades v2.0

✅ **Lê dados REAIS do Windows Event Log** (sem CSV necessário)  
✅ **Reconhece o ambiente** - hostname, OS, user, domínio  
✅ **Verifica permissões** - avisa se não for Admin  
✅ **4 canais de log** - Security, System, Application, PowerShell  
✅ **Análises expandidas** - brute force, account takeover, serviços suspeitos, scripts PS  
✅ **Relatórios multi-formato** - Console, CSV, TXT  

## Uso Rápido

### 1️⃣ **Correr como Admin** (opção 1 - Recomendado)

```bash
# Windows: executar o batch
run_admin.bat

# Ou manualmente no PowerShell (como Admin):
python security_analyzer.py
```

### 2️⃣ **Se não tiver Admin agora**

Usa os dados de teste:
```bash
python security_analyzer.py --input logs.csv
```

## O que o Script Faz

### 1. Mostra informação do sistema
```
============================================================
             WINDOWS SECURITY LOG ANALYZER v2.0             
============================================================

[SYSTEM INFO]
  Hostname:    PC-FNUNO
  User:        fnuno
  Domain:      PC-FNUNO
  OS:          10.0.26200 (Windows 11)
  Date:        2026-05-12 20:38:05
  Admin:       YES [OK]
```

### 2. Verifica acesso aos logs
```
[LOG ACCESS]
  [OK] Security Channel
  [OK] System Channel
  [OK] Application Channel
  [OK] Microsoft-Windows-PowerShell/Operational
```

### 3. Carrega eventos das últimas 24h
```
[READING LOGS]
  Timeframe: Last 24 hours

  [+] Security                                  → 1204 events
  [+] System                                    → 456 events
  [+] Application                               → 89 events
  [+] Microsoft-Windows-PowerShell/Operational  → 34 events
  
  [+] Total events loaded: 1783
```

### 4. Analisa e gera relatórios
```
[ANALYSIS RESULTS]
  Total Events: 1783
  Failed Logins: 45
  Success Logins: 23
  Accounts Created: 2
  Overall Risk: [MEDIUM]

[ALERTS]
  [CRITICAL]: 2
  [HIGH]: 8
  [MEDIUM]: 15
```

## Logs Analisados

### Security (Principal)
- **4625** - Failed Logon
- **4624** - Successful Logon
- **4720** - User Account Created ⚠️
- **4724** - Password Reset
- **4728** - User Added to Group ⚠️
- **5379** - Credential Manager Access ⚠️

### System
- **6005** - System Startup
- **6006** - System Shutdown
- **7045** - New Service Installed ⚠️ (suspeito)
- **1074** - System Restart

### Application
- **1000** - Application Crash
- **1001** - Windows Error Reporting

### PowerShell (Crítico)
- **4104** - Script Block Logging ⚠️ (detecta scripts maliciosos)
- **4103** - Module Logging

## Análises Realizadas

### 1. Brute Force Detection
Detecta múltiplas tentativas de login falhadas do mesmo IP

**Alert se:**
- > 5 falhas do mesmo IP para a mesma conta

### 2. Account Takeover
Detecta falhas seguidas de login bem-sucedido rápido

**Alert se:**
- Múltiplas falhas + sucesso em < 5 minutos

### 3. Suspicious Account Creation
Detecta criação de contas com nomes suspeitos

**Nomes suspeitos:** test, admin2, temp, backup2, service2, guest2

### 4. Suspicious Services
Detecta instalação de novos serviços (Event 7045)

### 5. PowerShell Anomalies
Detecta scripts PowerShell perigosos com keywords:
- System.Net
- DownloadString
- Invoke-*
- IEX
- reflection
- Bypass

## Outputs

Todos os ficheiros são salvos em `./reports/`:

```
reports/
├── alerts_20260512_203800.csv     ← Todos os alertas em CSV
└── report_20260512_203800.txt     ← Relatório em texto
```

### CSV (Fácil de importar)
```csv
level,type,details,timestamp
CRITICAL,Brute Force Attack,...,2026-05-12T20:38:00
HIGH,New Service Installed,...,2026-05-12T20:45:00
```

### TXT (Legível)
```
WINDOWS SECURITY LOG ANALYSIS REPORT
======================================================================
Generated: 2026-05-12T20:38:00.123456

Total Events: 1783
Alerts (CRITICAL/HIGH): 2/8

CRITICAL: Brute Force Attack
  target_account: admin
  failed_attempts: 25
  source_ip: 192.168.1.100
  ...
```

## Parâmetros Opcionais

```bash
# Análise das últimas 24 horas (default)
python security_analyzer.py

# Análise dos últimos 7 dias
python security_analyzer.py --hours 168

# Usar CSV em vez de Event Log
python security_analyzer.py --input meus_logs.csv
```

## Troubleshooting

### "Script requires Administrator privileges"
```powershell
# Opção 1: Correr o batch (mais fácil)
run_admin.bat

# Opção 2: PowerShell como Admin
Start-Process powershell -Verb RunAs
cd C:\Users\fnuno\Documents\security_analyzer
python security_analyzer.py
```

### "No events found in the last 24 hours"
```bash
# Aumentar timeframe
python security_analyzer.py --hours 168  # 1 semana

# Ou usar CSV de teste
python security_analyzer.py --input logs.csv
```

### "Log access denied"
Certifique-se de que está a correr como Administrator. O Windows Event Log requer privilégios de Admin.

## Estrutura de Ficheiros

```
security_analyzer/
├── security_analyzer.py      ← Script principal (reescrito v2.0)
├── run_admin.bat             ← Executa como Admin (Windows)
├── run_admin.ps1             ← Alternativa PowerShell
├── requirements.txt          ← Dependências
├── README.md                 ← Este ficheiro
│
├── data/
│   └── sample_logs.csv       ← Dados de teste
│
├── reports/                  ← Outputs (gerados)
│   ├── alerts_*.csv
│   └── report_*.txt
│
└── logs/                     ← Logs de execução
```

## Licença

MIT

---

**Desenvolvido para análise profissional de segurança em Windows**
