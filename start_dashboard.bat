@echo off
title Security Analyzer Dashboard
echo.
echo  ============================================
echo   Windows Security Log Analyzer v2.0
echo   Web Dashboard Launcher
echo  ============================================
echo.

:: Check for Admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo  [OK] A correr como Administrador
    echo  [OK] Windows Event Logs disponiveis
) else (
    echo  [AVISO] Sem privilegios de Administrador
    echo  [AVISO] Apenas analise CSV disponivel
    echo.
    echo  Para analise completa, feche e execute:
    echo  Botao direito neste ficheiro -^> Executar como administrador
    echo.
    pause
)

echo.
echo  A iniciar backend...
start "" /B python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

echo  A aguardar backend arrancar...
timeout /t 3 /nobreak >nul

echo  A abrir browser...
start "" http://localhost:8000

echo.
echo  Dashboard disponivel em: http://localhost:8000
echo  Para fechar, feche esta janela (encerra o servidor).
echo.
pause
