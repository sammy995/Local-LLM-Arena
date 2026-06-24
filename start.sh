#!/usr/bin/env bash
# Local LLM Arena — one-command install & launch (macOS / Linux)
# Usage:  ./start.sh   (installs everything the first time, then runs)
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[X] '$1' not found. $2"; exit 1; }; }

echo "Local LLM Arena — setup & launch"
need python3 "Install Python 3.11+ from https://python.org"
need node    "Install Node 20+ from https://nodejs.org"
command -v ollama >/dev/null 2>&1 || echo "[!] Ollama not found — install from https://ollama.com (needed to run models)."

echo "==> Backend: virtual env + dependencies"
cd "$root/backend"
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/python -m pip install -q --upgrade pip
./.venv/bin/python -m pip install -q -e .

echo "==> Frontend: install + production build"
cd "$root/frontend"
if [ -f package-lock.json ]; then npm ci; else npm install; fi
npm run build

echo "==> Running at http://127.0.0.1:7860  (Ctrl+C to stop)"
cd "$root/backend"
exec ./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 7860
