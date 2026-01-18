# Ollama-course — Local Ollama chat + web UI

This repository contains small scripts and a web UI to run local Ollama models for interactive chat.

What’s included
- `Chatbot.py` — lightweight terminal chatbot that uses `ollama.chat` with robust response extraction.
- `web_chat.py` — Flask-based web UI (see `templates/` and `static/`) for browser chat, model selection, and export.
- `templates/index.html`, `static/app.js`, `static/styles.css` — polished Bootstrap-based UI and client logic.
- `.github/` — prompts and chatmode templates used by local tools.
- `requirements.txt` — test/development dependencies.

How to run
1. Create & activate a virtual environment, then install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run the web UI:

```powershell
python .\web_chat.py
```

Open http://127.0.0.1:7860

Notes
- Ensure Ollama is installed and available locally; models must be pulled (`ollama pull <model-id>`) before use.
