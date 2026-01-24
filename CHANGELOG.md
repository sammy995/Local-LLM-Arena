# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-24

### 🎉 Major Release - Enterprise Architecture Refactor

### Added
- **Enterprise Architecture**: Modular application structure with separation of concerns
  - Application factory pattern with `create_app()`
  - Blueprint-based routing (api_bp, web_bp)
  - Service layer for Ollama interactions
  - Middleware for authentication and logging
  - Centralized error handling
- **Configuration Management**: Environment-based configuration with validation
  - Development, production, and default configs
  - Environment variable support via `.env` files
  - Configuration validation on startup
- **Comprehensive Logging**: Structured logging system
  - Module-specific loggers
  - Configurable log levels
  - Request/response logging
- **Model Management**: Built-in Ollama model manager
  - Browse 60+ popular models
  - Download models directly from UI
  - Delete installed models
  - Search and filter functionality
- **Custom Modals**: Replaced browser popups
  - Delete confirmation modal
  - Beautiful animated overlays
  - Keyboard support (Escape to close)
- **API Documentation**: Complete API docs with examples
  - `/api` prefix for all endpoints
  - Health check endpoint
  - cURL, Python, and JavaScript examples
- **Development Tools**:
  - `requirements-dev.txt` for dev dependencies
  - `.env.example` template
  - Comprehensive README with deployment guide

### Changed
- **API Routes**: All API endpoints now under `/api` prefix
  - `/models` → `/api/models`
  - `/chat` → `/api/chat`
  - `/stream_chat` → `/api/stream_chat`
  - `/pull_model` → `/api/pull_model`
  - `/delete_model` → `/api/delete_model`
- **Entry Point**: New `run.py` as main entry point (replaces `web_chat.py`)
- **Project Structure**: Reorganized into `app/` package
- **Requirements**: Updated with proper version constraints
- **Documentation**: Completely rewritten README

### Fixed
- Model search input clearing bug
- Loading state persistence in model manager
- API endpoint consistency

### Deprecated
- `web_chat.py` - Use `run.py` instead (legacy file kept for compatibility)

---

## [1.0.0] - 2026-01-23

### Initial Feature-Complete Release

### Added
- Multi-model arena for comparing models side-by-side
- Single model chat mode
- Streaming and non-streaming responses
- Conversation management with persistence
- Prompt library with categories
- File upload support (text, code, images)
- Voting system for model responses
- Copy, regenerate, and continue actions
- Inline session renaming
- Keyboard shortcuts (Ctrl+Enter, Ctrl+N, Ctrl+K, Esc)
- Dark mode with smooth transitions
- Export conversations as JSON
- Loading indicators and timeout handling
- Stop button for canceling requests
- Performance metrics (tokens/sec)
- Active conversation indicator
- Stream toggle with ON/OFF labels
- File chip display for uploaded files
- Responsive mobile design
- Bootstrap 5 UI components

### Technical Features
- Flask backend with Ollama integration
- LocalStorage for client-side persistence
- Concurrent model requests with threading
- AbortController for request cancellation
- Clipboard API integration
- Markdown rendering with code highlighting
- Comprehensive CSS with CSS variables
- System prompt customization
- Draft message persistence

---

## [0.1.0] - Initial Development

### Added
- Basic chat interface
- Model selection
- Simple conversation history
- Flask server setup
- Static file serving

---

## Legend

- 🎉 Major release
- ✨ New feature
- 🐛 Bug fix
- 🔧 Configuration
- 📝 Documentation
- ♻️ Refactor
- ⚡ Performance
- 🔒 Security
- 🎨 UI/UX
- 🧪 Testing
