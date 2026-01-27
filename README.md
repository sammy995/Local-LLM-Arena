# Ollama Arena — Local Multi-Model AI Comparison Platform

A privacy-first, local-only web application for side-by-side evaluation of multiple AI models via Ollama, with **blind evaluation**, **per-model hyperparameters**, and exportable results.

**Version 3.0.0** — Advanced Model Configuration & Blind Testing

> **Note**: This application uses [Ollama](https://ollama.ai) (© Ollama, Inc.) as the local inference engine. Ollama is a separate product with its own [MIT License](https://github.com/ollama/ollama/blob/main/LICENSE). All models run locally on your machine through Ollama.

---

## 🎯 Problem Statement

### Privacy and Compliance Constraints in AI Evaluation

Organizations and individuals in regulated industries (healthcare, finance, legal, government) face significant barriers when evaluating AI models:

- **Data Sensitivity**: Sending proprietary or sensitive data to cloud-based comparison platforms (ChatGPT Arena, LMSys) violates privacy policies and compliance requirements (GDPR, HIPAA, SOX)
- **API Key Risk**: Cloud tools require API keys, creating security exposure and audit complexity
- **No Control Over Data**: Once data leaves local systems, there's no guarantee of deletion, non-training use, or compliance with data residency laws
- **Vendor Lock-in**: Cloud platforms control access, pricing, and model availability

### Limitations of Cloud-Based Comparison Tools

Existing solutions like ChatGPT Arena and LMSys are excellent for public benchmarking, but fail for:

- **Private datasets**: Cannot evaluate models on proprietary or confidential information
- **Offline environments**: Require internet connectivity and external dependencies
- **Reproducibility**: No control over model versions, parameters, or state persistence
- **Cost**: API usage fees accumulate quickly during evaluation campaigns
- **Auditability**: No local logs or exportable artifacts for compliance reporting

**Ollama Arena solves this** by bringing multi-model evaluation entirely to your local machine, with zero external API calls and complete data sovereignty.

---

## 🏗️ System Overview

### Local-First Architecture

Ollama Arena is a **100% local, zero-cloud** Flask web application that orchestrates multiple AI models through Ollama:

- **No API Keys Required**: All models run locally via Ollama's inference engine
- **No Internet Dependency**: Works completely offline (after initial model downloads)
- **Full Data Control**: Conversations never leave your machine
- **Browser-Based UI**: Modern, responsive interface accessible at `http://127.0.0.1:7860`

### Multi-Model Orchestration with Advanced Configuration

- **Arena Mode**: Send identical prompts to 2-6 models simultaneously for blind comparison
- **Blind Evaluation**: Hide model identities to eliminate bias (Model A, B, C labels)
- **Per-Model Hyperparameters**: Configure 6 parameters independently per model instance
  - `temperature`, `top_p`, `top_k`, `repeat_penalty`, `num_predict`, `seed`
- **Multi-Configuration Testing**: Compare same model with different parameter sets
- **Single Model Mode**: Interactive chat with one model at a time
- **Dynamic Model Switching**: Start in arena mode, continue conversations with individual models
- **Real-Time Streaming**: See responses as they're generated, character by character

### Persistent State and Exportable Artifacts

- **Conversation Export**: Download full chat histories as JSON with timestamps and metadata
- **Blind Mode Export**: Privacy-preserving exports with masked model names until revealed
- **Session Persistence**: Conversations survive browser refreshes (in-memory state)
- **Model Metadata Tracking**: Records model names, hyperparameters, response times, and token counts
- **Voting System**: Like/dislike responses in blind mode for unbiased evaluation
- **Audit Trail**: Complete logs available in `logger.py` output for compliance verification

---

## ✨ Key Features (v3.0.0)

### 🎭 Blind Evaluation Mode

**Eliminate bias in model comparison** by hiding model identities during evaluation.

- **Anonymous Labels**: Models displayed as "Model A", "Model B", "Model C"
- **Randomized Order**: Display order randomized to prevent position bias
- **Voting System**: 👍/👎 buttons for each response (blind to which model)
- **Model Reveal**: Unlock actual identities with detailed statistics
  - Shows model names, hyperparameters, and vote counts
  - Locks voting after reveal to preserve integrity
- **Privacy-Preserving Export**: Masked model names in JSON until reveal
  - Filename gets `_blind` suffix for clarity
  - Full mapping included after reveal

**Use Cases**:
- Unbiased benchmarking without brand perception
- Team evaluations where model choices are debated
- A/B testing without preconceived notions
- Educational settings to teach critical evaluation

### ⚙️ Per-Model Hyperparameters

**Fine-tune each model instance independently** with 6 Ollama-supported parameters:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `temperature` | 0.01-2.0 | 0.7 | Controls randomness (low = deterministic, high = creative) |
| `top_p` | 0-1 | 0.9 | Nucleus sampling (cumulative probability cutoff) |
| `top_k` | 0-100 | 40 | Limits token choices to top K candidates |
| `repeat_penalty` | 1.0-2.0 | 1.1 | Penalizes repetitive text (higher = more diverse) |
| `num_predict` | -1 to 4096 | -1 | Max tokens to generate (-1 = unlimited) |
| `seed` | 0+ | 0 | For reproducible outputs (0 = random) |

**Visual Display**: Model chips show all parameters inline:
- Core params always visible: `gemma3:1b (T=0.7 P=0.9 K=40)`
- Advanced params shown when non-default: `+ R=1.5 M=500 S=42`

**Persistence**: Hyperparameters saved per model instance, survive refreshes

### 🔄 Multi-Configuration Testing

**Compare the same model with different parameter sets** to optimize performance:

- **Unique Instances**: `gemma3:1b` at T=0.1, T=0.7, T=2.0 treated as separate models
- **Deterministic IDs**: Instance ID = `{model}__{temp}_{top_p}_{top_k}_{repeat}_{predict}_{seed}`
  - Example: `gemma3_1b__0.7_0.9_40_1.1_-1_0`
- **Prevents Duplicates**: Cannot add identical model+param combos twice
- **Visual Distinction**: Each instance shown as separate chip with parameters

**Use Cases**:
- Find optimal temperature for creative vs. factual tasks
- Test impact of `top_k` on response diversity
- Discover best `repeat_penalty` for long-form content
- Compare deterministic (seed set) vs. random outputs

### 📊 Enhanced Model Reveal

When you click "Reveal All Models" in blind mode:

| Blind Label | Actual Model | Hyperparameters | 👍 Likes | 👎 Dislikes |
|-------------|--------------|-----------------|---------|-------------|
| Model A | gemma3:1b | `T=0.7 P=0.9 K=40 R=1.1 M=-1 S=0` | 3 | 1 |
| Model B | qwen2.5:3b | `T=0.5 P=0.8 K=30 R=1.2 M=500 S=42` | 5 | 0 |
| Model C | llama3.2:3b | `T=1.0 P=1.0 K=50 R=1.0 M=-1 S=0` | 2 | 2 |

- **Hyperparameters Column**: Shows full configuration for each instance
- **Vote Counts**: Aggregate likes/dislikes across all responses
- **Makes Distinguishing Easy**: See which parameter set performed best

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER (localhost:7860)                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Web UI (templates/index.html + static/app.js)          │   │
│  │  • Arena mode (multi-model) vs Single mode              │   │
│  │  • Blind evaluation with voting                         │   │
│  │  • Per-model hyperparameter controls (6 params)         │   │
│  │  • Real-time streaming display                          │   │
│  │  • Copy, export, regenerate controls                    │   │
│  └──────────────────────┬──────────────────────────────────┘   │
└─────────────────────────┼────────────────────────────────────────┘
                          │ HTTP/SSE (local only)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│             FLASK APP (web_chat.py + app/)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Routes & API (app/routes.py, app/api_routes.py)        │  │
│  │  • /chat (arena mode) - broadcasts to N models          │  │
│  │  • Supports model_instances with hyperparameters        │  │
│  │  • /single_chat - single model streaming                │  │
│  │  • /export - JSON conversation download                 │  │
│  │  • /models - list available Ollama models               │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  Ollama Service (app/ollama_service.py)                 │  │
│  │  • Model validation & health checks                     │  │
│  │  • Streaming response handlers                          │  │
│  │  • Hyperparameter passthrough to Ollama API             │  │
│  │  • Error recovery & retry logic                         │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────┼────────────────────────────────────────┘
                          │ localhost:11434 (Ollama API)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OLLAMA (Local Process)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Model Inference Engine                                  │  │
│  │  • llama3.2, qwen2.5, gemma2, etc.                       │  │
│  │  • GPU acceleration (if available)                       │  │
│  │  • Model parameter control (temp, top_p, top_k, etc.)    │  │
│  │  • Accepts options: repeat_penalty, num_predict, seed    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                          │ Local filesystem only
                          ▼
               [Models stored in ~/.ollama/models/]

═══════════════════════════════════════════════════════════════════
                    🚫 NO CLOUD BOUNDARY 🚫
         ALL PROCESSING HAPPENS ON YOUR LOCAL MACHINE
         NO DATA TRANSMITTED TO EXTERNAL SERVICES
═══════════════════════════════════════════════════════════════════
```

**Key Data Flows:**
1. User sends prompt via browser → Flask backend receives it locally
2. User configures hyperparameters per model instance in UI
3. Flask routes to arena (multi-model) or single-model handler
4. Backend extracts `model_instances` array with params, passes options to Ollama
5. Ollama service streams responses from local Ollama instance with configured params
6. Results streamed back to browser in real-time via Server-Sent Events
7. Blind mode masks model identities, voting system tracks preferences
8. Export function serializes conversation to JSON (masked or revealed based on state)

---

## 🧠 Key Design Decisions

### Why Local-First?

**Privacy is non-negotiable** for many use cases:
- Evaluating models on confidential business data (contracts, financials, customer records)
- Testing with PII (personal identifiable information) in regulated sectors
- Research with sensitive datasets (medical records, legal documents)
- Competitive analysis using proprietary information

**Cost and control**:
- No per-token API fees (models run on your hardware)
- No rate limits or quotas
- Complete control over model versions and parameters
- Works in air-gapped or restricted network environments

### Why Blind Evaluation?

Human evaluation of AI quality is **highly subjective and influenced by brand perception**:

- **Eliminates Bias**: Without knowing which model is which, evaluators judge purely on output quality
- **Surprises**: Smaller models often outperform larger ones on specific tasks
- **Team Consensus**: Resolves debates by letting results speak for themselves
- **Educational**: Teaches critical evaluation without preconceived notions

### Why Per-Model Hyperparameters?

Different tasks require different parameter sets:

- **Creative Writing**: High temperature (1.5+), high top_p (0.95+)
- **Code Generation**: Low temperature (0.1-0.3), low top_k (10-20)
- **Factual Q&A**: Medium temperature (0.5-0.7), repeat_penalty (1.2+)
- **Reproducibility**: Set seed > 0 for deterministic outputs

**Flexibility**: Run same model at multiple temperatures to find optimal setting for your use case.

### Why Human-in-the-Loop Evaluation?

Automated metrics (perplexity, BLEU, F1) **fail to capture real-world usefulness**:

- **Context matters**: A "wrong" answer may be more helpful than a "correct" but pedantic one
- **Tone and empathy**: Critical for customer service, healthcare, education use cases
- **Domain expertise**: Only humans can judge accuracy in specialized fields (law, medicine, engineering)
- **Safety and ethics**: Automated tools miss subtle biases, offensive content, or dangerous advice

**Ollama Arena enables rapid human evaluation**:
- See 2-6 model responses instantly
- Compare side-by-side in real-time
- Export conversations for team review or compliance audits

### Why Persistent State Matters

**Reproducibility and accountability**:
- **Audit trails**: Export conversations with timestamps for compliance reporting
- **Iterative evaluation**: Refine prompts and re-test without losing history
- **Team collaboration**: Share exported JSON for peer review
- **Long-term tracking**: Monitor model performance over time as versions change

**Technical robustness**:
- In-memory session state survives browser refreshes
- Graceful error handling prevents conversation data loss
- Structured JSON exports enable integration with analysis tools

---

## 🤖 AI-Assisted QA Workflow

This project was developed using **AI-assisted coding and testing** (GitHub Copilot, ChatGPT), demonstrating the power—and limitations—of AI-driven development.

### How the Testing Agent Was Used

1. **Test Case Generation**: AI generated comprehensive test scenarios for arena mode, single mode, error handling, and edge cases
2. **Bug Discovery Automation**: AI systematically tested all UI features (copy, export, regenerate, model switching) and documented failures
3. **Fix Implementation**: AI proposed code patches for 6 critical bugs, which were reviewed and applied
4. **Regression Testing**: After fixes, AI re-validated all workflows to ensure no new breaks

### What It Caught

✅ **6 Critical Bugs Fixed**:
- Missing "Copy Response" button in single-model mode
- "Continue with One Model" feature not working in arena mode
- Regenerate button triggering errors on edge cases
- Export function missing metadata fields
- Model switching race conditions
- UI state inconsistencies after rapid interactions

✅ **Code Quality Issues**:
- Inconsistent error handling in streaming responses
- Missing input validation for model selection
- Unhandled edge cases in conversation history management

### What It Didn't Catch

❌ **User Experience Nuances**:
- Confusing button labels (AI didn't recognize UX friction)
- Suboptimal response rendering for long outputs (required manual CSS tuning)
- Accessibility issues (keyboard navigation, screen reader support)

❌ **Performance Edge Cases**:
- Memory leaks with 50+ message conversations (found during manual stress testing)
- Streaming lag with slow models (AI couldn't simulate real latency)

❌ **Domain-Specific Validation**:
- Model response quality assessment (AI can't judge "good" vs. "bad" answers)
- Privacy/security review (e.g., ensuring no telemetry or logging of sensitive data)

### Why Human Oversight Remains Essential

**AI is a powerful co-pilot, not an autopilot**:
- AI-generated tests are narrow and literal (miss creative edge cases)
- AI cannot evaluate subjective quality (UX, tone, usefulness)
- AI lacks contextual judgment (business requirements, compliance needs)
- **Final accountability rests with humans** (code reviews, security audits, production deployment decisions)

**Hybrid workflow works best**:
1. Use AI for initial scaffolding, boilerplate, and systematic testing
2. Apply human judgment for architecture, UX, security, and domain correctness
3. Iterate: AI proposes, human refines, AI validates, human approves

---

## 🎯 Use Cases

### 1. Research
- **Academic ML Research**: Compare model architectures on standardized benchmarks without cloud API costs
- **Prompt Engineering**: Rapidly iterate on prompt designs and see how different models respond
- **Model Selection**: Evaluate which open-source model (Llama, Qwen, Gemma) best fits your task

### 2. Regulated Environments
- **Healthcare**: Test AI assistants on synthetic patient data locally (HIPAA compliance)
- **Finance**: Evaluate models on financial reports without violating SOX/GDPR
- **Legal**: Compare legal reasoning models on case files (attorney-client privilege)
- **Government**: Air-gapped evaluation in secure environments

### 3. Enterprise Pre-Deployment Evaluation
- **Model Vetting**: Test multiple models on real-world tasks before committing to vendor contracts
- **Cost-Benefit Analysis**: Compare cloud API models (via local proxies) vs. self-hosted options
- **Team Alignment**: Export conversation samples for stakeholder review before production deployment
- **Risk Assessment**: Identify biases, hallucinations, or safety issues in candidate models

---

## 🚀 How to Run

### Prerequisites
- **Python 3.8+**
- **Ollama CLI** installed ([ollama.ai](https://ollama.ai))
- At least one model pulled (e.g., `ollama pull llama3.2`)

### Installation

1. **Create & activate a virtual environment:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell
# or: source .venv/bin/activate (Linux/Mac)
```

2. **Install dependencies:**

```powershell
pip install -r requirements.txt
```

3. **Pull Ollama models** (if not already done):

```bash
ollama pull llama3.2
ollama pull qwen2.5:latest
ollama pull gemma2:9b
```

### Running the Application

**Option 1: Web UI (Recommended)**

```powershell
python .\web_chat.py
```

Open http://127.0.0.1:7860 in your browser.

**Option 2: Terminal Chat**

```powershell
python .\Chatbot.py
```

### What's Included

- [web_chat.py](web_chat.py) — Flask app entry point
- [run.py](run.py) — Alternative entry point
- [app/](app/) — Backend modules (routes, Ollama service, error handlers)
- [templates/index.html](templates/index.html) — Web UI template
- [static/app.js](static/app.js) — Frontend logic (arena mode, streaming, export)
- [static/styles.css](static/styles.css) — Bootstrap-based responsive design
- [Chatbot.py](Chatbot.py) — Terminal chatbot (single model)
- [config.py](config.py) — Application configuration
- [logger.py](logger.py) — Structured logging for debugging and audits
- [requirements.txt](requirements.txt) — Python dependencies

---

## 📚 How to Cite

If you use Ollama Arena in your research, please cite:

```bibtex
@software{ollama_arena_2026,
  author       = {Lagad, Shubham},
  title        = {Ollama Arena: Local-First Multi-Model AI Comparison Platform},
  year         = {2026},
  month        = {January},
  url          = {https://github.com/yourusername/ollama-arena},
  note         = {Privacy-first side-by-side evaluation of local AI models via Ollama},
  license      = {MIT}
}
```

**Key Features to Highlight in Citations:**
- Local-first architecture (zero cloud dependencies)
- Multi-model orchestration for blind comparison
- Human-in-the-loop evaluation workflows
- Compliance-friendly (GDPR, HIPAA, SOX)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**Copyright © 2026 Shubham Lagad**

### Third-Party Software Notice

This software uses [Ollama](https://ollama.ai) (© Ollama, Inc.), which is a separate product with its own license terms. Ollama is not included in this MIT License. Please refer to [Ollama's license](https://github.com/ollama/ollama) for details.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- **Code of Conduct**: Respectful, inclusive collaboration
- **Development Setup**: How to fork, clone, and set up dev environment
- **Coding Standards**: Python style guide, linting rules, test requirements
- **Pull Request Process**: Branch naming, commit messages, review workflow
- **Issue Guidelines**: Bug reports, feature requests, documentation improvements

**Quick Start for Contributors:**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test locally
4. Run linter: `pip install -r requirements-dev.txt && flake8`
5. Submit PR with clear description of changes

**Priority Areas for Contribution:**
- 🔧 Accessibility improvements (ARIA labels, keyboard navigation)
- 🎨 UI/UX enhancements (dark mode, mobile responsiveness)
- 📊 Export formats (CSV, Markdown, PDF)
- 🧪 Automated testing (pytest suite expansion)
- 📖 Documentation (tutorials, video guides, translations)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ollama-arena/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ollama-arena/discussions)
- **Changelog**: See [CHANGELOG.md](CHANGELOG.md) for version history
- **Detailed Article**: [Designing a Local First LLM Evaluation system](https://medium.com/@shubhamlagad/designing-a-local-first-llm-evaluation-system-068f556a2fb8)

---

**Made with ❤️ for privacy-conscious AI practitioners**
