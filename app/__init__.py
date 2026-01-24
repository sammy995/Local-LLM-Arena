"""
Ollama Arena Application Package.
Provides a web interface for comparing multiple LLM models side-by-side.
"""
from flask import Flask
from config import get_config
from logger import setup_logging

__version__ = '2.0.0'
__author__ = 'Shubham Lagad'


def create_app(config_name: str = 'default') -> Flask:
    """
    Application factory pattern.
    
    Args:
        config_name: Configuration environment name
    
    Returns:
        Configured Flask application instance
    """
    # Initialize Flask app
    app = Flask(
        __name__,
        static_folder='../static',
        template_folder='../templates'
    )
    
    # Load configuration
    config = get_config(config_name)
    app.config.from_object(config)
    
    # Setup logging
    logger = setup_logging(config.LOG_LEVEL, config.LOG_FORMAT)
    logger.info(f"Starting Ollama Arena v{__version__}")
    logger.info(f"Configuration: {config_name}")
    
    # Register blueprints
    from app.routes import api_bp, web_bp
    app.register_blueprint(web_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Register error handlers
    from app.error_handlers import register_error_handlers
    register_error_handlers(app)
    
    return app
