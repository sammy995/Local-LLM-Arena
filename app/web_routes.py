"""
Web routes for serving the frontend.
"""
from flask import Blueprint, render_template, send_from_directory
import os
from logger import get_logger

logger = get_logger('web_routes')

web_bp = Blueprint('web', __name__)


@web_bp.route('/')
def index():
    """Serve the main application page."""
    logger.debug("Serving index page")
    return render_template('index.html')


@web_bp.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files."""
    static_folder = os.path.join(os.path.dirname(__file__), '..', 'static')
    return send_from_directory(static_folder, filename)
