#Requires -Version 5.0
<#
.SYNOPSIS
    Lanca o Web Dashboard do Windows Security Log Analyzer
.DESCRIPTION
    Inicia o backend FastAPI e abre o browser automaticamente.
    Para analise completa de Event Logs, executar como Administrador.
#>

$ErrorActionPreference = 'SilentlyContinue'

Write-Host ""
Write-Host " ============================================" -ForegroundColor Cyan
Write-Host "  Windows Security Log Analyzer v2.0" -ForegroundColor White
Write-Host "  Web Dashboard Launcher" -ForegroundColor White
Write-Host " ============================================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host " [OK] A correr como Administrador" -ForegroundColor Green
    Write-Host " [OK] Windows Event Logs disponiveis" -ForegroundColor Green
} else {
    Write-Host " [AVISO] Sem privilegios de Administrador" -ForegroundColor Yellow
    Write-Host " [AVISO] Apenas analise CSV disponivel" -ForegroundColor Yellow
    Write-Host ""
    Write-Host " Para analise completa, execute como Administrador:" -ForegroundColor Gray
    Write-Host " Start-Process powershell -Verb RunAs -ArgumentList '-File start_dashboard.ps1'" -ForegroundColor Gray
}

Write-Host ""
Write-Host " A iniciar backend..." -ForegroundColor White

# Start backend
$backend = Start-Process python -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" -PassThru -WindowStyle Hidden

Write-Host " Backend PID: $($backend.Id)" -ForegroundColor Gray
Write-Host " A aguardar backend arrancar..." -ForegroundColor White
Start-Sleep -Seconds 3

Write-Host " A abrir browser..." -ForegroundColor White
Start-Process "http://localhost:8000"

Write-Host ""
Write-Host " Dashboard disponivel em: http://localhost:8000" -ForegroundColor Green
Write-Host " Prima Ctrl+C ou feche esta janela para encerrar." -ForegroundColor Gray
Write-Host ""

# Keep running so closing the window kills the process
try {
    Wait-Process -Id $backend.Id
} catch {
    Write-Host " Backend encerrado." -ForegroundColor Yellow
}
