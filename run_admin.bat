@echo off
REM Windows Security Analyzer - Run as Administrator

cd /d "%~dp0"

REM Check if running as admin
net session >nul 2>&1
if %errorlevel% equ 0 (
    echo [+] Running with Administrator privileges...
    python security_analyzer.py %*
) else (
    echo [-] This script requires Administrator privileges.
    echo [*] Elevating...
    powershell -Command "Start-Process cmd -ArgumentList '/c cd %cd% && python security_analyzer.py %*' -Verb RunAs"
)
