from flask import Flask, request, jsonify, render_template, send_from_directory, Response, stream_with_context
import ollama
import os
import subprocess
import concurrent.futures
import json
import time
import threading
import queue

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


@app.route('/api/models', methods=['GET'])
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


@app.route('/api/chat', methods=['POST'])
def chat():
    ok, msg = _require_auth()
    if not ok:
        return jsonify({'error': msg}), 401

    data = request.get_json(force=True)
    user_message = data.get('message', '')
    history = data.get('history', None)
    system = data.get('system', 'You are a sharp teacher like Richard Feynman.')
    # 'models' may be a list (arena mode) or a single string 'model'
    models = data.get('models') or ([data.get('model')] if data.get('model') else [DEFAULT_MODEL])
    if isinstance(models, str):
        models = [models]

    if history is None:
        history = [{'role': 'system', 'content': system}]

    # Append user's message to the shared history used as a base for each model call,
    # but avoid duplicating if the client already included the message as the last entry.
    base_history = list(history)
    if not (isinstance(base_history, list) and len(base_history) and base_history[-1].get('role') == 'user' and base_history[-1].get('content') == user_message):
        base_history.append({'role': 'user', 'content': user_message})

    # Trim history for reliability
    if isinstance(base_history, list) and len(base_history) > HISTORY_LIMIT:
        base_history = base_history[-HISTORY_LIMIT:]

    # If only one model requested, keep backward-compatible shape
    if len(models) <= 1:
        model = models[0] if models else DEFAULT_MODEL
        try:
            start_time = time.time()
            resp = ollama.chat(model=model, messages=base_history)
            assistant_text = _extract_assistant_text(resp) or ''
            duration = time.time() - start_time
            token_count = len(assistant_text.split())
            metrics = {
                'tokens': token_count,
                'duration': duration,
                'tokens_per_sec': token_count / duration if duration > 0 else 0,
                'first_token_time': 0
            }
            base_history.append({'role': 'assistant', 'content': assistant_text})
            return jsonify({'assistant': assistant_text, 'history': base_history, 'metrics': metrics})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # Arena mode: query multiple models in parallel and return per-model responses and histories
    results = {}
    errors = {}

    def call_model(m):
        try:
            local_hist = list(base_history)
            start_time = time.time()
            resp = ollama.chat(model=m, messages=local_hist)
            assistant_text = _extract_assistant_text(resp) or ''
            duration = time.time() - start_time
            token_count = len(assistant_text.split())
            metrics = {
                'tokens': token_count,
                'duration': duration,
                'tokens_per_sec': token_count / duration if duration > 0 else 0,
                'first_token_time': 0
            }
            local_hist.append({'role': 'assistant', 'content': assistant_text})
            return (m, {'assistant': assistant_text, 'history': local_hist, 'metrics': metrics})
        except Exception as ex:
            return (m, {'error': str(ex)})

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, len(models))) as ex:
        futures = [ex.submit(call_model, m) for m in models]
        for f in concurrent.futures.as_completed(futures):
            m, out = f.result()
            if out.get('error'):
                errors[m] = out['error']
            else:
                results[m] = out
    # Return per-model results and the base history (which should include the user's message but not model replies).
    return jsonify({'results': results, 'errors': errors, 'base_history': base_history})


@app.route('/api/stream_chat', methods=['POST'])
def stream_chat():
    """Stream responses from multiple models as newline-delimited JSON chunks.
    Each chunk is a JSON object with fields: model, type ('token'|'done'|'error'|'metrics'), token (for token), text (for done), metrics (for metrics).
    """
    ok, msg = _require_auth()
    if not ok:
        return jsonify({'error': msg}), 401

    data = request.get_json(force=True)
    user_message = data.get('message', '')
    history = data.get('history', None)
    system = data.get('system', 'You are a sharp teacher like Richard Feynman.')
    models = data.get('models') or ([data.get('model')] if data.get('model') else [DEFAULT_MODEL])
    if isinstance(models, str):
        models = [models]

    if history is None:
        history = [{'role': 'system', 'content': system}]
    base_history = list(history)
    base_history.append({'role': 'user', 'content': user_message})

    q = queue.Queue()
    done_flags = {m: False for m in models}

    def worker(m):
        start = time.time()
        first_token_time = None
        token_count = 0
        try:
            # Try streaming via ollama if supported
            try:
                stream_resp = ollama.chat(model=m, messages=list(base_history), stream=True)
                # stream_resp is an iterator of chunks
                for chunk in stream_resp:
                    # attempt to extract text/token
                    text = _extract_assistant_text(chunk) or ''
                    # treat each chunk as a token piece
                    if text:
                        token_count += len(text.split())
                        if first_token_time is None:
                            first_token_time = time.time()
                        q.put(json.dumps({'model': m, 'type': 'token', 'token': text}) + "\n")
                # after stream ends, send done with accumulated text (best-effort)
                # try to call a non-streaming to get final reply if needed
                try:
                    final = ollama.chat(model=m, messages=list(base_history))
                    final_text = _extract_assistant_text(final) or ''
                except Exception:
                    final_text = ''
            except TypeError:
                # ollama.chat doesn't support stream param; fall back
                resp = ollama.chat(model=m, messages=list(base_history))
                final_text = _extract_assistant_text(resp) or ''
                if final_text:
                    token_count = len(final_text.split())
                    first_token_time = time.time()

            q.put(json.dumps({'model': m, 'type': 'done', 'text': final_text}) + "\n")
            duration = time.time() - start
            metrics = {'first_token_time': (first_token_time - start) if first_token_time else None, 'duration': duration, 'tokens': token_count, 'tokens_per_sec': (token_count / duration) if duration>0 else None}
            q.put(json.dumps({'model': m, 'type': 'metrics', 'metrics': metrics}) + "\n")
        except Exception as e:
            q.put(json.dumps({'model': m, 'type': 'error', 'error': str(e)}) + "\n")
        finally:
            done_flags[m] = True

    # start workers
    for m in models:
        t = threading.Thread(target=worker, args=(m,), daemon=True)
        t.start()

    @stream_with_context
    def event_stream():
        # yield items from queue until all done
        while True:
            try:
                item = q.get(timeout=0.1)
                yield item
            except queue.Empty:
                if all(done_flags.values()):
                    break
                continue

    return Response(event_stream(), mimetype='application/x-ndjson')


@app.route('/api/pull_model', methods=['POST'])
def pull_model():
    """Pull/download a model from Ollama library."""
    ok, msg = _require_auth()
    if not ok:
        return jsonify({'error': msg}), 401
    
    data = request.get_json()
    model_name = data.get('model', '')
    
    if not model_name:
        return jsonify({'error': 'Model name is required'}), 400
    
    try:
        # Run ollama pull in background
        def pull_async():
            subprocess.run(['ollama', 'pull', model_name], check=True, capture_output=True, text=True)
        
        thread = threading.Thread(target=pull_async, daemon=True)
        thread.start()
        
        return jsonify({'status': 'downloading', 'model': model_name}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/delete_model', methods=['POST'])
def delete_model():
    """Delete a model from Ollama."""
    ok, msg = _require_auth()
    if not ok:
        return jsonify({'error': msg}), 401
    
    data = request.get_json()
    model_name = data.get('model', '')
    
    if not model_name:
        return jsonify({'error': 'Model name is required'}), 400
    
    try:
        result = subprocess.run(['ollama', 'rm', model_name], capture_output=True, text=True, check=True)
        return jsonify({'status': 'deleted', 'model': model_name}), 200
    except subprocess.CalledProcessError as e:
        return jsonify({'error': f'Failed to delete model: {e.stderr}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Bind to 0.0.0.0 in environments where remote access is desired; default keeps localhost-only.
    bind = os.environ.get('WEB_BIND', '127.0.0.1')
    port = int(os.environ.get('WEB_PORT', '7860'))
    debug = os.environ.get('WEB_DEBUG', '1') == '1'
    app.run(host=bind, port=port, debug=debug)
