"""
API routes for the Ollama Arena application.
Handles all API endpoints for chat, model management, etc.
"""
from flask import Blueprint, request, jsonify, Response, stream_with_context
from typing import Dict, Any
import json
import time
import threading
import queue
import concurrent.futures

from app.ollama_service import OllamaService
from app.middleware import require_auth
from config import get_config
from logger import get_logger

logger = get_logger('routes')
config = get_config()

api_bp = Blueprint('api', __name__)
ollama_service = OllamaService()


@api_bp.route('/models', methods=['GET'])
@require_auth
def get_models():
    """Get list of available Ollama models."""
    try:
        models = ollama_service.list_models()
        
        if not models:
            # Return default models if none found
            models = [config.DEFAULT_MODEL, 'gemma2:2b']
        
        return jsonify({'models': models}), 200
        
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/chat', methods=['POST'])
@require_auth
def chat():
    """
    Handle single or multi-model chat request.
    Supports both streaming and non-streaming modes.
    """
    try:
        data = request.get_json()
        
        messages = data.get('history', [])
        models = data.get('models', [])
        use_stream = data.get('stream', False)
        
        if not messages:
            return jsonify({'error': 'No messages provided'}), 400
        
        if not models:
            return jsonify({'error': 'No models selected'}), 400
        
        # Limit history
        if len(messages) > config.HISTORY_LIMIT:
            logger.warning(f"Truncating history from {len(messages)} to {config.HISTORY_LIMIT}")
            messages = messages[-config.HISTORY_LIMIT:]
        
        # Single model request
        if len(models) == 1:
            model = models[0]
            logger.info(f"Single model chat: {model}")
            
            response = ollama_service.chat(model, messages, stream=False)
            
            return jsonify({
                'model': model,
                'response': response['content'],
                'metrics': response.get('metrics', {})
            }), 200
        
        # Multi-model request (arena mode)
        logger.info(f"Multi-model chat: {models}")
        results = {}
        
        def chat_with_model(model_name: str) -> Dict[str, Any]:
            """Helper to chat with a single model."""
            start_time = time.time()
            try:
                response = ollama_service.chat(model_name, messages, stream=False)
                return {
                    'model': model_name,
                    'response': response['content'],
                    'metrics': response.get('metrics', {}),
                    'error': None
                }
            except Exception as e:
                logger.error(f"Error with {model_name}: {e}")
                return {
                    'model': model_name,
                    'response': '',
                    'metrics': {},
                    'error': str(e)
                }
        
        # Execute requests in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=config.MAX_CONCURRENT_REQUESTS) as executor:
            futures = {executor.submit(chat_with_model, model): model for model in models}
            
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                results[result['model']] = result
        
        return jsonify({'results': results}), 200
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/stream_chat', methods=['POST'])
@require_auth
def stream_chat():
    """
    Handle streaming chat requests for multiple models.
    Returns NDJSON stream with real-time updates.
    """
    try:
        data = request.get_json()
        
        messages = data.get('history', [])
        models = data.get('models', [])
        
        if not messages or not models:
            return jsonify({'error': 'Invalid request'}), 400
        
        # Limit history
        if len(messages) > config.HISTORY_LIMIT:
            messages = messages[-config.HISTORY_LIMIT:]
        
        logger.info(f"Stream chat for models: {models}")
        
        # Shared queue for streaming tokens
        token_queue = queue.Queue()
        done_flags = {model: False for model in models}
        
        def stream_model(model_name: str):
            """Stream tokens from a single model."""
            try:
                for token in ollama_service.chat_stream(model_name, messages):
                    token_queue.put({
                        'model': model_name,
                        'token': token,
                        'done': False
                    })
                
                token_queue.put({
                    'model': model_name,
                    'token': '',
                    'done': True
                })
                
            except Exception as e:
                logger.error(f"Stream error for {model_name}: {e}")
                token_queue.put({
                    'model': model_name,
                    'error': str(e),
                    'done': True
                })
        
        # Start streaming threads
        threads = []
        for model in models:
            thread = threading.Thread(target=stream_model, args=(model,), daemon=True)
            thread.start()
            threads.append(thread)
        
        def event_stream():
            """Generate SSE events."""
            while True:
                try:
                    event = token_queue.get(timeout=0.1)
                    
                    if event.get('done'):
                        done_flags[event['model']] = True
                    
                    yield json.dumps(event) + '\n'
                    
                    if all(done_flags.values()):
                        break
                        
                except queue.Empty:
                    if all(done_flags.values()):
                        break
                    continue
        
        return Response(
            stream_with_context(event_stream()),
            mimetype='application/x-ndjson'
        )
        
    except Exception as e:
        logger.error(f"Stream chat error: {e}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/pull_model', methods=['POST'])
@require_auth
def pull_model():
    """Download a model from Ollama registry."""
    try:
        data = request.get_json()
        model_name = data.get('model', '')
        
        if not model_name:
            return jsonify({'error': 'Model name is required'}), 400
        
        logger.info(f"Pulling model: {model_name}")
        
        # Run pull in background thread
        def pull_async():
            ollama_service.pull_model(model_name)
        
        thread = threading.Thread(target=pull_async, daemon=True)
        thread.start()
        
        return jsonify({
            'status': 'downloading',
            'model': model_name
        }), 200
        
    except Exception as e:
        logger.error(f"Pull model error: {e}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/delete_model', methods=['POST'])
@require_auth
def delete_model():
    """Delete a model from local storage."""
    try:
        data = request.get_json()
        model_name = data.get('model', '')
        
        if not model_name:
            return jsonify({'error': 'Model name is required'}), 400
        
        logger.info(f"Deleting model: {model_name}")
        
        success = ollama_service.delete_model(model_name)
        
        if success:
            return jsonify({
                'status': 'deleted',
                'model': model_name
            }), 200
        else:
            return jsonify({'error': 'Failed to delete model'}), 500
        
    except Exception as e:
        logger.error(f"Delete model error: {e}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'ollama-arena',
        'models_available': len(ollama_service.list_models())
    }), 200
