# Run Security Analyzer as Administrator

$ScriptPath = Join-Path $PSScriptRoot "security_analyzer.py"

# Check if already running as admin
$isAdmin = [bool]([Security.Principal.WindowsIdentity]::GetCurrent().Groups -match "S-1-5-32-544")

if ($isAdmin) {
    # Already admin, run directly
    Write-Host "Running with Administrator privileges..." -ForegroundColor Green
    python $ScriptPath @args
} else {
    # Need to elevate
    Write-Host "Elevating to Administrator..." -ForegroundColor Yellow
    $pythonPath = (Get-Command python).Source
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\security_analyzer.py`"" -Verb RunAs
}
