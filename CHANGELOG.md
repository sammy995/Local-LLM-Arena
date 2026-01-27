# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-01-27

### 🎉 Major Release - Advanced Model Configuration & Blind Evaluation

### Added

#### Per-Model Hyperparameters
- **Comprehensive Hyperparameter Control**: Configure 6 parameters per model instance
  - `temperature` (0.01-2.0): Controls randomness in responses
  - `top_p` (0-1): Nucleus sampling for token selection
  - `top_k` (0-100): Limits token choices to top K candidates
  - `repeat_penalty` (1.0-2.0): Penalizes repetitive text
  - `num_predict` (-1 to 4096): Maximum tokens to generate (-1 = unlimited)
  - `seed` (0+): For reproducible outputs (0 = random)
- **Visual Hyperparameter Display**: Model chips show all configured parameters
  - Condensed format: `T=0.7 P=0.9 K=40`
  - Advanced params shown only when non-default (R, M, S)
- **Persistent Configuration**: Hyperparameters saved per model instance
- **UI Integration**: Inline parameter controls in model selection interface

#### Blind Evaluation Mode
- **Unbiased Model Comparison**: Hide model identities during evaluation
  - Models displayed as "Model A", "Model B", etc.
  - Randomized display order to prevent position bias
  - Voting system (thumbs up/down) for each response
- **Reveal Functionality**: Unmask models with detailed statistics
  - Shows actual model names and hyperparameters
  - Displays vote counts per model
  - Locks voting after reveal to preserve integrity
- **Export with Blind Mode**: Privacy-preserving exports
  - Masked model names and instance IDs in unrevealed state
  - Full mapping included after reveal
  - `_blind` suffix in filename for clarity
- **Session Persistence**: Blind state survives page refreshes

#### Same Model, Different Configurations
- **Multi-Instance Support**: Run identical models with varying hyperparameters
  - Example: Compare `gemma3:1b` at T=0.1 vs T=0.9 vs T=2.0
  - Unique instance IDs based on model + hyperparams
  - Prevents duplicate configurations
- **Configuration Chips**: Visual distinction between instances
  - Color-coded or labeled chips
  - Shows full parameter set for each variant

#### Enhanced Model Reveal
- **Detailed Statistics Table**: Shows blind label → actual model mapping
  - Hyperparameters column with all 6 parameters
  - Vote counts (upvotes/downvotes)
  - Makes distinguishing same-model configs easy
- **Code-Styled Display**: Hyperparams shown in monospace with background

#### UI/UX Improvements
- **Redesigned Blind Mode Toggle**: Better visual hierarchy
  - Inline with "Selected Models" header
  - Active state with gradient background
  - Styled reveal button with hover effects
- **Fixed HTML Structure**: Removed duplicate closing tags
  - Cleaner layout rendering
  - No more broken elements
- **Hyperparameter Reset**: New chat resets all params to defaults
- **Error Handling**: Better handling of missing metrics fields
  - Fallback to `duration_s` or `duration` for backwards compatibility
  - Prevents UI crashes from undefined fields

### Changed

#### Backend API Updates
- **Model Instance Protocol**: New `model_instances` array format
  ```json
  {
    "model_instances": [
      {
        "id": "gemma3_1b__0.7_0.9_40_1.1_-1_0",
        "model": "gemma3:1b",
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40,
        "repeat_penalty": 1.1,
        "num_predict": -1,
        "seed": 0
      }
    ]
  }
  ```
- **Options Passthrough**: All hyperparameters passed to Ollama API
  - Single model endpoint updated
  - Multi-model (arena) endpoint updated
  - Streaming endpoint updated
- **Response Format**: Returns `instance_id` instead of just `model`
  - Enables tracking specific configurations
  - Supports blind mode mapping

#### Frontend Refactoring
- **Display Name Logic**: Shows hyperparams in all contexts
  - Arena headers: `gemma3:1b (T=0.7 P=0.9 K=40)`
  - Model chips: Condensed format with advanced params
  - Blind mode: Only shows label (no leaks)
- **Export Logic**: Conditional masking based on blind state
  - History entries masked in blind mode
  - Model instances replaced with blind labels
  - Full reveal data included post-reveal
- **Metrics Handling**: Unified duration field handling
  - Checks `duration_s` first, falls back to `duration`
  - No more `.toFixed()` errors on undefined

### Fixed
- Metrics display errors when backend returns `duration_s` vs `duration`
- Blind mode toggle not showing active state correctly
- Reveal button CSS class mismatch (was `btn-warning`, now `btn-reveal`)
- HTML structure with extra closing `</div>` tags
- Hyperparameters not being passed to Ollama in API calls
- Model reveal table missing hyperparameter information
- Export function not preserving blind mode privacy

### Deprecated
- Legacy `models` array in API (use `model_instances` for full control)
- Hardcoded default hyperparams in UI (now centralized in `DEFAULT_HYPERPARAMS`)

### Security
- Blind mode export ensures no model identity leakage before reveal
- Instance IDs sanitized in exported data when in blind mode

---

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
