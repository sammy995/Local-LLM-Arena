"""
Error handlers for the application.
"""
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException
from logger import get_logger

logger = get_logger('error_handlers')


def register_error_handlers(app: Flask) -> None:
    """Register error handlers for the application."""
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors."""
        logger.warning(f"404 error: {error}")
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors."""
        logger.error(f"500 error: {error}")
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Handle all HTTP exceptions."""
        logger.warning(f"HTTP {error.code} error: {error.description}")
        return jsonify({
            'error': error.description,
            'code': error.code
        }), error.code
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Handle all unhandled exceptions."""
        logger.exception(f"Unhandled exception: {error}")
        return jsonify({
            'error': 'An unexpected error occurred',
            'details': str(error)
        }), 500
