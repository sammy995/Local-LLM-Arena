"""
Ollama Arena - Main Application Entry Point
Multi-model LLM comparison web application.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from config import get_config
from logger import get_logger

logger = get_logger('main')


def main():
    """Main application entry point."""
    try:
        # Get configuration
        config = get_config()
        
        # Create Flask app
        app = create_app()
        
        # Run the application
        logger.info(f"Starting server on {config.HOST}:{config.PORT}")
        logger.info(f"Debug mode: {config.DEBUG}")
        
        app.run(
            host=config.HOST,
            port=config.PORT,
            debug=config.DEBUG
        )
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
