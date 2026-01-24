"""
Configuration management for Ollama Arena application.
Supports environment variables and default configurations.
"""
import os
from typing import Optional


class Config:
    """Application configuration."""
    
    # Flask settings
    HOST: str = os.environ.get('WEB_BIND', '127.0.0.1')
    PORT: int = int(os.environ.get('WEB_PORT', '7860'))
    DEBUG: bool = os.environ.get('WEB_DEBUG', '1') == '1'
    
    # Ollama settings
    DEFAULT_MODEL: str = os.environ.get('DEFAULT_MODEL', 'ministral-3:3b')
    HISTORY_LIMIT: int = int(os.environ.get('HISTORY_LIMIT', '40'))
    
    # Security settings
    AUTH_TOKEN: Optional[str] = os.environ.get('WEB_CHAT_TOKEN')
    SECRET_KEY: str = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Request settings
    REQUEST_TIMEOUT: int = int(os.environ.get('REQUEST_TIMEOUT', '90'))  # seconds
    MAX_CONCURRENT_REQUESTS: int = int(os.environ.get('MAX_CONCURRENT_REQUESTS', '5'))
    
    # File upload settings
    MAX_FILE_SIZE_MB: int = int(os.environ.get('MAX_FILE_SIZE_MB', '10'))
    ALLOWED_EXTENSIONS: set = {
        'txt', 'md', 'py', 'js', 'html', 'css', 'json', 'xml', 'yaml', 'yml',
        'jpg', 'jpeg', 'png', 'gif', 'webp'
    }
    
    # Logging settings
    LOG_LEVEL: str = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FORMAT: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    @classmethod
    def validate(cls) -> None:
        """Validate configuration settings."""
        if cls.PORT < 1 or cls.PORT > 65535:
            raise ValueError(f"Invalid port number: {cls.PORT}")
        
        if cls.HISTORY_LIMIT < 1:
            raise ValueError(f"HISTORY_LIMIT must be positive: {cls.HISTORY_LIMIT}")
        
        if cls.REQUEST_TIMEOUT < 1:
            raise ValueError(f"REQUEST_TIMEOUT must be positive: {cls.REQUEST_TIMEOUT}")


class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """Production environment configuration."""
    DEBUG = False
    LOG_LEVEL = 'WARNING'
    
    @classmethod
    def validate(cls) -> None:
        """Additional production validation."""
        super().validate()
        
        if cls.SECRET_KEY == 'dev-secret-key-change-in-production':
            raise ValueError("SECRET_KEY must be set in production!")


# Configuration selector
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': Config
}


def get_config(env: Optional[str] = None) -> Config:
    """Get configuration based on environment."""
    if env is None:
        env = os.environ.get('FLASK_ENV', 'default')
    
    config_class = config_map.get(env, Config)
    config_class.validate()
    
    return config_class
