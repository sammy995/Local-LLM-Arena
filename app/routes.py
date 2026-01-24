"""
Flask route blueprints registry.
"""
from app.api_routes import api_bp
from app.web_routes import web_bp

__all__ = ['api_bp', 'web_bp']
