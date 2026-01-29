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
    Supports model_instances with hyperparameters (temperature, top_p, top_k).
    """
    try:
        data = request.get_json()
        
        messages = data.get('history', [])
        user_message = data.get('message', '')
        system = data.get('system', 'You are a helpful assistant.')
        
        # Support model_instances with hyperparameters
        model_instances = data.get('model_instances')
        
        # Fallback to legacy 'models' or 'model' for backward compatibility
        if not model_instances:
            models = data.get('models', [])
            if not models:
                model = data.get('model')
                if model:
                    models = [model]
            model_instances = [{'id': m, 'model': m} for m in models] if models else []
        
        # Build history if not provided
        if not messages:
            messages = [{'role': 'system', 'content': system}]
        
        # Append user message if provided and not already in history
        if user_message:
            if not (messages and messages[-1].get('role') == 'user' and messages[-1].get('content') == user_message):
                messages.append({'role': 'user', 'content': user_message})
        
        if not messages or len(messages) < 2:
            return jsonify({'error': 'No messages provided'}), 400
        
        if not model_instances:
            return jsonify({'error': 'No models selected'}), 400
        
        # Limit history
        if len(messages) > config.HISTORY_LIMIT:
            logger.warning(f"Truncating history from {len(messages)} to {config.HISTORY_LIMIT}")
            messages = messages[-config.HISTORY_LIMIT:]
        
        logger.info(f"Received model_instances: {model_instances}")
        
        # Single model request
        if len(model_instances) == 1:
            inst = model_instances[0]
            model = inst.get('model', inst.get('id'))
            
            # Build options from hyperparameters
            options = {}
            if inst.get('temperature') is not None:
                options['temperature'] = float(inst['temperature'])
            if inst.get('top_p') is not None:
                options['top_p'] = float(inst['top_p'])
            if inst.get('top_k') is not None:
                options['top_k'] = int(inst['top_k'])
            if inst.get('repeat_penalty') is not None:
                options['repeat_penalty'] = float(inst['repeat_penalty'])
            if inst.get('num_predict') is not None:
                options['num_predict'] = int(inst['num_predict'])
            if inst.get('seed') is not None and int(inst['seed']) != 0:
                options['seed'] = int(inst['seed'])
            
            logger.info(f"Single model chat: {model} with options: {options}")
            
            response = ollama_service.chat(model, messages, stream=False, options=options)
            
            return jsonify({
                'model': model,
                'assistant': response['content'],
                'response': response['content'],
                'metrics': response.get('metrics', {}),
                'instance_id': inst.get('id')
            }), 200
        
        # Multi-model request (arena mode)
        logger.info(f"Multi-model chat: {[i.get('model', i.get('id')) for i in model_instances]}")
        results = {}
        errors = {}
        
        def chat_with_instance(inst: Dict[str, Any]) -> Dict[str, Any]:
            """Helper to chat with a single model instance."""
            instance_id = inst.get('id')
            model = inst.get('model', instance_id)
            
            # Build options from hyperparameters
            options = {}
            if inst.get('temperature') is not None:
                options['temperature'] = float(inst['temperature'])
            if inst.get('top_p') is not None:
                options['top_p'] = float(inst['top_p'])
            if inst.get('top_k') is not None:
                options['top_k'] = int(inst['top_k'])
            if inst.get('repeat_penalty') is not None:
                options['repeat_penalty'] = float(inst['repeat_penalty'])
            if inst.get('num_predict') is not None:
                options['num_predict'] = int(inst['num_predict'])
            if inst.get('seed') is not None and int(inst['seed']) != 0:
                options['seed'] = int(inst['seed'])
            
            logger.info(f"Arena: Calling {model} (id={instance_id}) with options: {options}")
            
            try:
                response = ollama_service.chat(model, messages, stream=False, options=options)
                return {
                    'instance_id': instance_id,
                    'model': model,
                    'assistant': response['content'],
                    'response': response['content'],
                    'metrics': response.get('metrics', {}),
                    'error': None
                }
            except Exception as e:
                logger.error(f"Error with {model}: {e}")
                return {
                    'instance_id': instance_id,
                    'model': model,
                    'assistant': '',
                    'response': '',
                    'metrics': {},
                    'error': str(e)
                }
        
        # Execute requests in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=config.MAX_CONCURRENT_REQUESTS) as executor:
            futures = {executor.submit(chat_with_instance, inst): inst for inst in model_instances}
            
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                instance_id = result['instance_id']
                results[instance_id] = result
                if result['error']:
                    errors[instance_id] = result['error']
        
        return jsonify({'results': results, 'errors': errors}), 200
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/stream_chat', methods=['POST'])
@require_auth
def stream_chat():
    """
    Handle streaming chat requests for multiple models.
    Returns NDJSON stream with real-time updates.
    Supports model_instances with hyperparameters.
    """
    try:
        data = request.get_json()
        
        messages = data.get('history', [])
        user_message = data.get('message', '')
        system = data.get('system', 'You are a helpful assistant.')
        
        # Support model_instances with hyperparameters
        model_instances = data.get('model_instances')
        
        # Fallback to legacy 'models' for backward compatibility
        if not model_instances:
            models = data.get('models', [])
            model_instances = [{'id': m, 'model': m} for m in models] if models else []
        
        # Build history if not provided
        if not messages:
            messages = [{'role': 'system', 'content': system}]
        
        # Append user message if provided
        if user_message:
            if not (messages and messages[-1].get('role') == 'user' and messages[-1].get('content') == user_message):
                messages.append({'role': 'user', 'content': user_message})
        
        if not messages or len(messages) < 2 or not model_instances:
            return jsonify({'error': 'Invalid request'}), 400
        
        # Limit history
        if len(messages) > config.HISTORY_LIMIT:
            messages = messages[-config.HISTORY_LIMIT:]
        
        logger.info(f"Stream chat for model_instances: {model_instances}")
        
        # Shared queue for streaming tokens
        token_queue = queue.Queue()
        done_flags = {inst.get('id'): False for inst in model_instances}
        
        def stream_model(inst: Dict[str, Any]):
            """Stream tokens from a single model instance."""
            instance_id = inst.get('id')
            model = inst.get('model', instance_id)
            start_time = time.time()
            first_token_time = None
            token_count = 0
            
            # Build options from hyperparameters
            options = {}
            if inst.get('temperature') is not None:
                options['temperature'] = float(inst['temperature'])
            if inst.get('top_p') is not None:
                options['top_p'] = float(inst['top_p'])
            if inst.get('top_k') is not None:
                options['top_k'] = int(inst['top_k'])
            if inst.get('repeat_penalty') is not None:
                options['repeat_penalty'] = float(inst['repeat_penalty'])
            if inst.get('num_predict') is not None:
                options['num_predict'] = int(inst['num_predict'])
            if inst.get('seed') is not None and int(inst['seed']) != 0:
                options['seed'] = int(inst['seed'])
            
            try:
                for token in ollama_service.chat_stream(model, messages, options=options):
                    if first_token_time is None:
                        first_token_time = time.time()
                    token_count += len(token.split())
                    token_queue.put({
                        'type': 'token',
                        'model': model,
                        'instance_id': instance_id,
                        'token': token,
                        'done': False
                    })

                end_time = time.time()
                duration_s = end_time - start_time
                first_token_delta = (first_token_time - start_time) if first_token_time else duration_s
                tokens_per_sec = (token_count / duration_s) if duration_s > 0 else 0

                token_queue.put({
                    'type': 'metrics',
                    'model': model,
                    'instance_id': instance_id,
                    'token': '',
                    'metrics': {
                        'tokens': token_count,
                        'duration_s': duration_s,
                        'first_token_time': first_token_delta,
                        'tokens_per_sec': round(tokens_per_sec, 2)
                    },
                    'done': True
                })

            except Exception as e:
                logger.error(f"Stream error for {model}: {e}")
                token_queue.put({
                    'type': 'error',
                    'model': model,
                    'instance_id': instance_id,
                    'error': str(e),
                    'done': True
                })
        
        # Start streaming threads
        threads = []
        for inst in model_instances:
            thread = threading.Thread(target=stream_model, args=(inst,), daemon=True)
            thread.start()
            threads.append(thread)
        
        def event_stream():
            """Generate SSE events."""
            while True:
                try:
                    event = token_queue.get(timeout=0.1)
                    
                    if event.get('done'):
                        done_flags[event.get('instance_id', event.get('model'))] = True
                    
                    yield json.dumps(event) + '\n'
                    
                    if all(done_flags.values()):
                        break
                        
                except queue.Empty:
                    if all(done_flags.values()):
                        break
                    continue
        
        response = Response(
            stream_with_context(event_stream()),
            mimetype='application/x-ndjson'
        )
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['X-Accel-Buffering'] = 'no'
        response.headers['Connection'] = 'keep-alive'
        return response
        
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
