from flask import Flask, request, jsonify, render_template, send_from_directory
import ollama
import os
import subprocess

app = Flask(__name__, static_folder='static', template_folder='templates')

# Configuration
DEFAULT_MODEL = os.environ.get('DEFAULT_MODEL', 'ministral-3:3b')
HISTORY_LIMIT = int(os.environ.get('HISTORY_LIMIT', '40'))
AUTH_TOKEN = os.environ.get('WEB_CHAT_TOKEN')  # optional: set to require a bearer token


def _extract_assistant_text(resp) -> str:
    """Robust extraction for different ollama response shapes."""
    try:
        if hasattr(resp, 'response') and resp.response:
            return resp.response
    except Exception:
        pass
    try:
        if hasattr(resp, 'message'):
            msg = resp.message
            if isinstance(msg, dict):
                return msg.get('content') or msg.get('text') or str(msg)
            return getattr(msg, 'content', str(msg))
    except Exception:
        pass
    try:
        data = resp.model_dump() if hasattr(resp, 'model_dump') else (resp.dict() if hasattr(resp, 'dict') else None)
        if isinstance(data, dict):
            if data.get('response'):
                return data['response']
            m = data.get('message')
            if isinstance(m, dict):
                return m.get('content') or m.get('text') or str(m)
            return str(m)
    except Exception:
        pass
    try:
        return str(resp)
    except Exception:
        return ''


def _require_auth():
    """Return (ok, message) where ok is False if auth fails."""
    if not AUTH_TOKEN:
        return True, ''
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth.split(None, 1)[1]
        if token == AUTH_TOKEN:
            return True, ''
    return False, 'missing or invalid Authorization Bearer token'


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(os.path.join(app.root_path, 'static'), filename)


@app.route('/models', methods=['GET'])
def models():
    """Attempt to list installed Ollama models. If the CLI is available, parse its output; otherwise
    return a sensible default list including the DEFAULT_MODEL.
    """
    ok, msg = _require_auth()
    if not ok:
        return jsonify({'error': msg}), 401

    models = [DEFAULT_MODEL, 'gemma3:1b']
    try:
        # Try to call the ollama CLI and parse names from its output
        p = subprocess.run(['ollama', 'list'], capture_output=True, text=True, check=False)
        out = p.stdout.strip().splitlines()
        parsed = []
        for line in out:
            parts = line.split()
            if parts and parts[0] != 'NAME':
                parsed.append(parts[0])
        if parsed:
            models = parsed
    except Exception:
        pass
    return jsonify({'models': models})


@app.route('/clear', methods=['POST'])
def clear():
    ok, msg = _require_auth()
    if not ok:
        return jsonify({'error': msg}), 401
    # Client-side will reset history; server doesn't persist state between requests.
    return jsonify({'ok': True})


@app.route('/chat', methods=['POST'])
def chat():
    ok, msg = _require_auth()
    if not ok:
        return jsonify({'error': msg}), 401

    data = request.get_json(force=True)
    user_message = data.get('message', '')
    history = data.get('history', None)
    system = data.get('system', 'You are a sharp teacher like Richard Feynman.')
    model = data.get('model', DEFAULT_MODEL)

    if history is None:
        history = [{'role': 'system', 'content': system}]

    history.append({'role': 'user', 'content': user_message})

    # Trim history for reliability (keeps last N messages)
    if isinstance(history, list) and len(history) > HISTORY_LIMIT:
        history = history[-HISTORY_LIMIT:]

    try:
        resp = ollama.chat(model=model, messages=history)
        assistant_text = _extract_assistant_text(resp) or ''
        history.append({'role': 'assistant', 'content': assistant_text})
        return jsonify({'assistant': assistant_text, 'history': history})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Bind to 0.0.0.0 in environments where remote access is desired; default keeps localhost-only.
    bind = os.environ.get('WEB_BIND', '127.0.0.1')
    port = int(os.environ.get('WEB_PORT', '7860'))
    debug = os.environ.get('WEB_DEBUG', '1') == '1'
    app.run(host=bind, port=port, debug=debug)
