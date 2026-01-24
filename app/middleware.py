"""
Middleware functions for request processing.
"""
from flask import request, jsonify
from functools import wraps
from typing import Callable, Any
from config import get_config
from logger import get_logger

logger = get_logger('middleware')
config = get_config()


def require_auth(f: Callable) -> Callable:
    """
    Decorator to require authentication for API endpoints.
    Checks for Bearer token if AUTH_TOKEN is configured.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs) -> Any:
        # Skip auth if no token configured
        if not config.AUTH_TOKEN:
            return f(*args, **kwargs)
        
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            logger.warning(f"Missing auth header for {request.path}")
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        
        token = auth_header.split(None, 1)[1]
        
        if token != config.AUTH_TOKEN:
            logger.warning(f"Invalid token attempt for {request.path}")
            return jsonify({'error': 'Invalid authorization token'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


def log_request(f: Callable) -> Callable:
    """Decorator to log incoming requests."""
    @wraps(f)
    def decorated_function(*args, **kwargs) -> Any:
        logger.info(f"{request.method} {request.path} from {request.remote_addr}")
        return f(*args, **kwargs)
    
    return decorated_function
