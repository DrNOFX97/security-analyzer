@echo off
cd /d C:\Users\fnuno\Documents\security_analyzer
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
