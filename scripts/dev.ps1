# Starts backend (uvicorn) + frontend (vite) in two PowerShell windows.
# Run from: improvement-plan/scaffold/
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root/backend'; if (!(Test-Path .venv)) { python -m venv .venv }; .\.venv\Scripts\Activate.ps1; pip install -e '.[dev]'; uvicorn app.main:app --reload --host 127.0.0.1 --port 7860"
)

Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root/frontend'; if (!(Test-Path node_modules)) { npm install }; npm run dev"
)

Write-Host "Backend -> http://127.0.0.1:7860/api/health"
Write-Host "Frontend -> http://127.0.0.1:5173"
