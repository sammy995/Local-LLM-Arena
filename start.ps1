# Local LLM Arena — one-command install & launch (Windows / PowerShell)
# Usage:  ./start.ps1        (installs everything the first time, then runs)
#         right-click > Run with PowerShell, or:  powershell -ExecutionPolicy Bypass -File start.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Need($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "[X] '$cmd' not found. $hint" -ForegroundColor Red
    exit 1
  }
}

Write-Host "Local LLM Arena — setup & launch" -ForegroundColor Yellow
Need python "Install Python 3.11+ from https://python.org"
Need node   "Install Node 20+ from https://nodejs.org"
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Host "[!] Ollama not found — install from https://ollama.com (needed to run models)." -ForegroundColor DarkYellow
}

Write-Host "==> Backend: virtual env + dependencies"
Set-Location "$root\backend"
if (-not (Test-Path .venv)) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install -q --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -q -e .

Write-Host "==> Frontend: install + production build"
Set-Location "$root\frontend"
if (Test-Path package-lock.json) { npm ci } else { npm install }
npm run build

Write-Host "==> Running at http://127.0.0.1:7860  (Ctrl+C to stop)" -ForegroundColor Green
Set-Location "$root\backend"
Start-Process "http://127.0.0.1:7860"
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 7860
