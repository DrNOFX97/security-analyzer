# Start Backend (FastAPI) in Admin PowerShell
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -Command `"cd 'C:\Users\fnuno\Documents\security_analyzer'; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`""

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Frontend in another Admin PowerShell
Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -Command `"cd 'C:\Users\fnuno\Documents\security_analyzer\frontend'; npm run dev`""

Write-Host "Dashboard servers started in admin mode!"
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
