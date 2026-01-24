# Ollama Arena - Multi-Model LLM Comparison Platform

An open-source web application for comparing multiple large language models side-by-side using local Ollama instances. Test and compare open-source models locally without sending data to external APIs.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)](https://flask.palletsprojects.com/)

**Created by:** Shubham Lagad

## 🎯 Why This Project?

Test and compare local LLM models without sending data to external APIs. Perfect for:

- **Privacy-focused users** - All processing happens on your machine
- **Researchers** - Compare model performance objectively
- **Developers** - Test prompts across multiple models
- **AI Enthusiasts** - Experiment with open-source models safely

*This project uses [Ollama](https://ollama.ai) (© Ollama, Inc.) as the local LLM runtime. Ollama is a separate project and all trademarks are property of their respective owners.*

## ✨ Features

### **🏟️ Arena Mode**
- **Multi-Model Comparison** - Compare up to 5 models simultaneously side-by-side
- **Real-time Streaming** - Token-by-token generation with live metrics
- **Performance Metrics** - Tokens/sec, response time, token count for each model
- **Model Switching** - Continue conversation with a single selected model mid-chat

### **💬 Response Management**
- **Copy Responses** - One-click copy to clipboard on every response
- **Regenerate Answers** - Re-run the same prompt to get different responses
- **Voting System** - Rate responses with 👍/👎 to track model performance
- **Response Actions** - All responses (single or arena) have action buttons

### **📦 Model Manager**
- **60+ Models** - Browse and download popular Ollama models in-app
- **Search & Filter** - Find models by name, size, or capability
- **One-Click Download** - Install models directly from the UI
- **Model Deletion** - Remove unused models to save space
- **Live Model List** - See all installed models with status

### **📚 Productivity Tools**
- **Prompt Library** - Pre-built prompts for common tasks (coding, summarization, etc.)
- **Custom Prompts** - Save your own prompts for reuse
- **System Prompts** - Customize AI behavior per conversation
- **File Attachments** - Upload multiple files (text, code, images)
- **Collapsible File List** - Compact view to maximize chat space
- **Persistent Files** - Files stay attached until manually removed

### **🎨 User Experience**
- **Dark/Light Mode** - Full theme support with smooth transitions
- **Keyboard Shortcuts** - Ctrl+Enter (send), Ctrl+N (new chat), Ctrl+K (focus), Esc (cancel)
- **Session Management** - Multiple conversations with auto-naming
- **Export Conversations** - Save your chat history
- **Custom Confirmations** - Beautiful modal dialogs (no browser popups)
- **5-Minute Timeout** - Extended timeout for multiple model requests

---

## 🚀 Getting Started

Choose your setup method based on your needs:

### Option 1: Simple Setup (For Users)

**Just want to try local models? Start here!**

This is the quickest way to get started - perfect if you just want to test and compare LLMs locally.

#### Prerequisites
- Install [Ollama](https://ollama.ai)
- Python 3.8+ installed

#### Steps

```bash
# 1. Clone the repository
git clone https://github.com/sammy995/ollama-local-chatbot.git
cd ollama-local-chatbot

# 2. Install dependencies
pip install flask ollama

# 3. Run the app
python web_chat.py
```

**That's it!** Open http://127.0.0.1:7860 in your browser.

#### Quick Tips
- Use the **📦 Models** button to download models directly in the UI
- Or download via command line: `ollama pull llama3.2:3b`
- Select multiple models (hold Ctrl) to compare side-by-side
- Press `Ctrl+C` in terminal to stop

---

### Option 2: Advanced Setup (For Developers)

**Want full control, testing, and customization? Use this method!**

This setup gives you the complete modular architecture with all development features.

#### Prerequisites
- Install [Ollama](https://ollama.ai)
- Python 3.8+
- Git

#### Full Installation

```bash
# 1. Clone repository
git clone https://github.com/sammy995/ollama-local-chatbot.git
cd ollama-local-chatbot

# 2. Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux/Mac:
source .venv/bin/activate

# 3. Install all dependencies
pip install -r requirements.txt

# 4. Optional: Copy and customize environment file
copy .env.example .env
# Edit .env with your preferred settings

# 5. Run with new modular architecture
python run.py

# OR use the original entry point
python web_chat.py
```

Open http://127.0.0.1:7860

#### Configuration Options

Create a `.env` file or set environment variables:

```bash
# Server
WEB_BIND=127.0.0.1        # Host address
WEB_PORT=7860             # Port number
WEB_DEBUG=1               # Debug mode (0 or 1)

# Security (optional)
WEB_CHAT_TOKEN=your-token # Bearer token for API auth
SECRET_KEY=your-secret    # Flask secret key

# Ollama
DEFAULT_MODEL=ministral-3:3b  # Default model
HISTORY_LIMIT=40              # Max chat messages

# Logging
LOG_LEVEL=INFO           # DEBUG, INFO, WARNING, ERROR
```

#### Project Structure

```
ollama-arena/
├── web_chat.py          # Main Flask app (simple entry point)
├── run.py               # New modular entry point
├── Chatbot.py           # CLI chatbot script
├── config.py            # Configuration management
├── logger.py            # Logging setup
├── app/                 # Modular application package
│   ├── __init__.py      # Application factory
│   ├── api_routes.py    # API endpoints
│   ├── web_routes.py    # Web routes
│   ├── ollama_service.py # Ollama integration
│   ├── middleware.py    # Auth & logging
│   ├── error_handlers.py # Error handling
│   └── routes.py        # Blueprint registry
├── static/
│   ├── app.js           # Frontend JavaScript (2000+ lines)
│   └── styles.css       # Styles with dark mode
├── templates/
│   └── index.html       # Main UI
├── requirements.txt     # Dependencies
└── requirements-dev.txt # Development dependencies
```

#### Development Mode

```bash
# Enable debug logging
export WEB_DEBUG=1
export LOG_LEVEL=DEBUG

# Run with auto-reload
python web_chat.py
```

#### Production Deployment

```bash
# Install production server
pip install gunicorn

# Set production config
export FLASK_ENV=production
export SECRET_KEY="your-secure-key"

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:7860 "app:create_app()"
```

---

## 📚 Usage Guide

### Downloading Models

**Option 1: Using UI**
1. Click **📦 Models** button (top-right)
2. Switch to "Available Models" tab
3. Search for models (e.g., "llama", "qwen", "deepseek")
4. Click **⬇️ Download**

**Option 2: Using CLI**
```bash
ollama pull llama3.2:3b
ollama pull qwen2.5:7b
ollama pull deepseek-r1:8b
```

### Comparing Models

1. Select multiple models from dropdown (Hold Ctrl/Cmd)
2. Type your question
3. Click **Send** or press `Ctrl+Enter`
4. View responses side-by-side

### Keyboard Shortcuts

- `Ctrl+Enter` - Send message
- `Ctrl+N` - New conversation
- `Ctrl+K` - Focus input
- `Esc` - Cancel request

---

## 📡 API Documentation

All API endpoints are under `/api` prefix. See [API.md](API.md) for complete documentation.

**Key Endpoints:**
- `GET /api/models` - List available models
- `POST /api/chat` - Send chat messages
- `POST /api/stream_chat` - Stream responses
- `POST /api/pull_model` - Download model
- `POST /api/delete_model` - Delete model
- `GET /api/health` - Health check

---

## 🔍 Troubleshooting

### No models showing?
```bash
# Download models via Ollama CLI
ollama pull llama3.2:3b

# Or use the Model Manager in the UI (📦 Models button)
```

### Port already in use?
```bash
# Windows PowerShell
$env:WEB_PORT="8080"
python web_chat.py

# Linux/Mac
export WEB_PORT=8080
python web_chat.py
```

### Can't connect to Ollama?
```bash
# Check if Ollama is installed and running
ollama list

# If not installed, download from https://ollama.ai
```

### Enable debug logging
```bash
# Windows PowerShell
$env:LOG_LEVEL="DEBUG"
python web_chat.py

# Linux/Mac
export LOG_LEVEL=DEBUG
python web_chat.py
```

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Shubham Lagad

---

## 🙏 Acknowledgments

- **[Ollama](https://ollama.ai)** (© Ollama, Inc.) - The powerful local LLM runtime that makes this possible
- **[Flask](https://flask.palletsprojects.com/)** - Python web framework
- **[Bootstrap](https://getbootstrap.com/)** - UI framework
- All contributors and users who make this project better

---

**Created with ❤️ by Shubham Lagad for the open-source AI community**

*Disclaimer: This is an independent open-source project not affiliated with Ollama, Inc. It uses the Ollama runtime (© Ollama, Inc.). All trademarks are property of their respective owners.*
