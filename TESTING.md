# Testing Guide - Security Analyzer v2.0

## Quick Test (5 minutos)

### 1️⃣ Teste com Dados de Teste (SEM Admin)
```bash
cd C:\Users\fnuno\Documents\security_analyzer
python security_analyzer.py --input logs.csv
```

**Esperado:**
```
============================================================
             WINDOWS SECURITY LOG ANALYZER v2.0             
============================================================

[SYSTEM INFO]
  Hostname:    PC-Vicente
  User:        fnuno
  Domain:      PC-VICENTE
  OS:          10.0.26200
  Date:        2026-05-12 20:XX:XX
  Admin:       NO [ELEVATED REQUIRED]

[ANALYSIS RESULTS]
  Total Events: 31
  Failed Logins: 21
  Success Logins: 3
  Accounts Created: 2
  Overall Risk: [CRITICAL]

[ALERTS]
  [CRITICAL]: 17
  [HIGH]: 1
  [MEDIUM]: 5
```

---

## Teste Completo (COM Admin)

### 2️⃣ Teste com Dados Reais do Event Log

#### Opção A: Batch (mais fácil)
```cmd
run_admin.bat
```

#### Opção B: PowerShell como Admin
```powershell
# 1. Abrir PowerShell como Admin
Start-Process powershell -Verb RunAs

# 2. Navegar para pasta
cd C:\Users\fnuno\Documents\security_analyzer

# 3. Correr script
python security_analyzer.py
```

#### Opção C: CMD como Admin
```cmd
cd C:\Users\fnuno\Documents\security_analyzer
python security_analyzer.py
```

**Esperado (com Admin):**
```
============================================================
             WINDOWS SECURITY LOG ANALYZER v2.0             
============================================================

[SYSTEM INFO]
  Hostname:    PC-Vicente
  User:        fnuno
  Domain:      PC-VICENTE
  OS:          10.0.26200
  Date:        2026-05-12 20:XX:XX
  Admin:       YES [OK]

[LOG ACCESS]
  [OK] Security Channel
  [OK] System Channel
  [OK] Application Channel
  [OK] Microsoft-Windows-PowerShell/Operational

[READING LOGS]
  Timeframe: Last 24 hours

  [+] Security                                  → 1234 events
  [+] System                                    → 456 events
  [+] Application                               → 89 events
  [+] Microsoft-Windows-PowerShell/Operational  → 34 events
  
  [+] Total events loaded: 1813

[ANALYSIS RESULTS]
  Total Events: 1813
  Failed Logins: 45
  Success Logins: 23
  Accounts Created: 2
  Overall Risk: [MEDIUM]

[ALERTS]
  [CRITICAL]: 0
  [HIGH]: 3
  [MEDIUM]: 12
```

---

## Testes Específicos

### 3️⃣ Teste de Detecção de Brute Force

Cria eventos de teste no Windows:

```powershell
# PowerShell como Admin

# Simular 10 tentativas de login falhadas
for ($i = 1; $i -le 10; $i++) {
    net use \\nonexistentserver\share password /user:testadmin /persistent:no 2>&1
    Start-Sleep -Milliseconds 100
}

# Depois correr o analyzer
python security_analyzer.py
```

**Esperado:**
- Detecção de múltiplas falhas (Event 4625)
- Alert com `[HIGH]` ou `[CRITICAL]` para Brute Force Attack

---

### 4️⃣ Teste de Detecção de Criação de Contas Suspeitas

```powershell
# PowerShell como Admin (Domain Admin required)

# Criar conta suspeita
New-LocalUser -Name "test" -Password (ConvertTo-SecureString "Pass123!" -AsPlainText -Force)

# Correr analyzer
python security_analyzer.py

# Limpar (depois)
Remove-LocalUser -Name "test" -Force
```

**Esperado:**
- Event 4720 (User Account Created)
- Alert com `[CRITICAL]` (nome "test" é suspeito)

---

### 5️⃣ Teste de Detecção de PowerShell Malicioso

```powershell
# PowerShell como Admin

# Habilitar Script Block Logging (se não estiver)
New-ItemProperty -Path "HKLM:\Software\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" `
    -Name "EnableScriptBlockLogging" -Value 1 -Force

# Executar comando suspeito (não prejudicial)
$code = @"
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
`$client = New-Object System.Net.WebClient
`$client.DownloadString('http://example.com')
"@

PowerShell.exe -Command $code

# Correr analyzer
python security_analyzer.py
```

**Esperado:**
- Event 4104 (Script Block Logging)
- Alert com `[HIGH]` para PowerShell anomaly (keywords: System.Net, DownloadString)

---

### 6️⃣ Teste de Instalação de Serviço Suspeito

```powershell
# PowerShell como Admin

# Criar serviço de teste
$ServiceName = "TestMalwareService"
$ExecutablePath = "C:\Windows\System32\notepad.exe"

New-Service -Name $ServiceName -BinaryPathName $ExecutablePath -StartupType Manual

# Correr analyzer
python security_analyzer.py

# Limpar
Remove-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
```

**Esperado:**
- Event 7045 (New Service Installed)
- Alert com `[HIGH]` para New Service Installed

---

## Verificação de Outputs

### 7️⃣ Verificar Ficheiros Gerados

```powershell
# Listar reports gerados
Get-ChildItem C:\Users\fnuno\Documents\security_analyzer\reports\

# Ver conteúdo do CSV
Get-Content C:\Users\fnuno\Documents\security_analyzer\reports\alerts_*.csv | Select-Object -First 5

# Ver relatório em TXT
Get-Content C:\Users\fnuno\Documents\security_analyzer\reports\report_*.txt
```

**Esperado:**
```
reports/
├── alerts_20260512_203800.csv      ← CSV com todos os alertas
└── report_20260512_203800.txt      ← Relatório em texto
```

---

## Testes de Robustez

### 8️⃣ Teste sem Admin (deve falhar graciosamente)

```bash
python security_analyzer.py
```

**Esperado:**
```
Admin:       NO [ELEVATED REQUIRED]

[!] ERROR: Script requires Administrator privileges
[*] Please run as Admin or execute:
    powershell -Command "Start-Process python '%~0' -Verb RunAs"
```

---

### 9️⃣ Teste com CSV inválido

```bash
python security_analyzer.py --input inexistent.csv
```

**Esperado:**
```
[-] Error loading CSV: [Errno 2] No such file or directory: 'inexistent.csv'
```

---

### 🔟 Teste com Timeframe Customizado

```bash
# Últimos 7 dias
python security_analyzer.py --hours 168

# Últimas 12 horas
python security_analyzer.py --hours 12

# Última 1 hora
python security_analyzer.py --hours 1
```

**Esperado:**
- Diferentes quantidades de eventos dependendo do timeframe
- Se timeframe muito curto: "No events found in the last X hours"

---

## Checklist de Validação

- [ ] **Teste 1**: Dados de teste carregam sem erro
- [ ] **Teste 2**: Script detecta falta de Admin
- [ ] **Teste 3**: Com Admin, logs são lidos de todos os 4 canais
- [ ] **Teste 4**: Alertas são gerados para os dados de teste
- [ ] **Teste 5**: CSV e TXT são criados em ./reports/
- [ ] **Teste 6**: Análise de brute force funciona
- [ ] **Teste 7**: Análise de criação de contas funciona
- [ ] **Teste 8**: Análise de PowerShell funciona
- [ ] **Teste 9**: Análise de serviços funciona
- [ ] **Teste 10**: Relatórios são legíveis e contêm dados correctos

---

## Troubleshooting

### Problema: "ModuleNotFoundError: No module named 'pandas'"

**Solução:**
```bash
pip install -r requirements.txt
```

---

### Problema: "Access is denied" ao ler Event Log

**Solução:**
Correr como Administrator (use `run_admin.bat`)

---

### Problema: "No events found in the last 24 hours"

**Opções:**
```bash
# Aumentar timeframe
python security_analyzer.py --hours 168

# Ou usar dados de teste
python security_analyzer.py --input logs.csv
```

---

### Problema: Script lento (PowerShell timeout)

Se o script fica preso, é possível que o canal Security tenha muitos eventos.

**Solução:**
- Aumentar timeout em `WindowsLogReader._read_log()`: mude `timeout=30` para `timeout=60`
- Ou reduzir timeframe: `--hours 12` em vez de `--hours 24`

---

## Performance Esperada

| Operação | Tempo |
|----------|-------|
| Carregar CSV (31 eventos) | < 1 segundo |
| Ler Event Log (1000+ eventos) | 5-15 segundos |
| Análise completa | < 2 segundos |
| Gerar relatórios | < 1 segundo |
| **Total (com Admin, 4 canais)** | **10-20 segundos** |

---

## Próximas Melhorias de Teste

- [ ] Criar script de teste automatizado (pytest)
- [ ] Mock das chamadas PowerShell para testes sem Admin
- [ ] Dataset maior de eventos para stress testing
- [ ] Validação de integridade dos relatórios CSV
