# Quick Start Guide — Ollama Arena v3.0.0

Get started with **blind evaluation** and **hyperparameter tuning** in minutes.

> **Note**: This application requires [Ollama](https://ollama.ai) (© Ollama, Inc.) running locally. Ollama is a separate open-source project licensed under the [MIT License](https://github.com/ollama/ollama/blob/main/LICENSE).

---

## ⚡ Prerequisites

1. **Ollama installed and running**: 
   ```powershell
   # Check if Ollama is running
   curl http://127.0.0.1:11434/api/tags
   ```
   
2. **Python 3.10+** with dependencies installed:
   ```powershell
   pip install -r requirements.txt
   ```

3. **At least 2 models downloaded** (for arena mode):
   ```powershell
   ollama pull gemma3:1b
   ollama pull qwen2.5:3b
   ollama pull llama3.2:3b
   ```

---

## 🚀 Launch the Application

```powershell
python web_chat.py
```

Open your browser: **http://127.0.0.1:7860**

---

## 📖 Basic Workflows

### 1️⃣ Standard Arena Mode (Visible Models)

**Compare multiple models side-by-side with known identities.**

1. **Select Models**: Click the dropdown, select 2-6 models
   - Models appear as chips: `gemma3:1b (T=0.7 P=0.9 K=40)`
2. **Configure Hyperparameters** (optional): Adjust sliders before adding
   - Temperature, top_p, top_k, repeat_penalty, num_predict, seed
3. **Add to Arena**: Click "➕ Add to Arena"
4. **Set System Prompt** (optional): Click "🔧 System Prompt" to set instructions
5. **Send Prompt**: Type your question, click "Send to Arena"
6. **Compare Responses**: See all responses side-by-side in real-time
7. **Export**: Click "💾 Export" to download JSON with full conversation history

**Example Use Case**: Compare code generation quality across `qwen2.5:3b`, `llama3.2:3b`, and `gemma3:1b` for Python refactoring tasks.

---

### 2️⃣ Blind Evaluation Mode (Anonymous Models)

**Eliminate bias by hiding model identities during evaluation.**

1. **Toggle Blind Mode**: Click the 🎭 "Blind Mode" toggle (turns purple when active)
2. **Select & Add Models**: Same as standard mode, but models will be hidden
   - You'll see: "Model A", "Model B", "Model C" instead of real names
   - Display order is randomized to prevent position bias
3. **Send Prompts & Vote**: 
   - Type your question, click "Send to Arena"
   - Click 👍 or 👎 on each response to vote
   - You won't know which model is which
4. **Reveal When Ready**: Click "🔓 Reveal All Models" button
   - Shows actual model names, hyperparameters, and vote counts
   - Voting gets locked after reveal
5. **Export with Privacy**: 
   - **Before reveal**: Export contains masked names (`_blind.json` suffix)
   - **After reveal**: Export contains full mapping

**Example Use Case**: Resolve team debates about which model is "best" without brand bias. Run evaluation, vote, then reveal — the data speaks for itself.

---

### 3️⃣ Multi-Configuration Testing (Same Model, Different Parameters)

**Find optimal hyperparameters by comparing multiple configurations of the same model.**

1. **Select Base Model**: Choose `gemma3:1b` from dropdown
2. **Configure First Instance**: 
   - Set Temperature = 0.1 (very deterministic)
   - Click "➕ Add to Arena"
3. **Add Second Instance**:
   - Select `gemma3:1b` again
   - Set Temperature = 0.9 (more creative)
   - Click "➕ Add to Arena"
4. **Add Third Instance**:
   - Select `gemma3:1b` again
   - Set Temperature = 2.0 (maximum creativity)
   - Click "➕ Add to Arena"
5. **Run Comparison**: Send prompts and see how parameter changes affect output
   - Chips will show: `gemma3:1b (T=0.1 ...)`, `gemma3:1b (T=0.9 ...)`, `gemma3:1b (T=2.0 ...)`
6. **Export Results**: Download JSON with full parameter sets for analysis

**Example Use Case**: Determine whether creative writing tasks benefit from T=1.5 or T=2.0 by testing multiple temperatures on the same model.

---

### 4️⃣ Hyperparameter Guide

**Fine-tune each model instance independently with 6 parameters:**

| Parameter | Range | Default | Best For | Notes |
|-----------|-------|---------|----------|-------|
| **Temperature** | 0.01-2.0 | 0.7 | Creativity control | Low (0.1-0.3) = factual, High (1.5-2.0) = creative |
| **top_p** | 0-1 | 0.9 | Nucleus sampling | Lower = more focused, Higher = more diverse |
| **top_k** | 0-100 | 40 | Token limit | Restricts vocabulary per step |
| **repeat_penalty** | 1.0-2.0 | 1.1 | Avoid repetition | Higher = more variation, 1.0 = no penalty |
| **num_predict** | -1 to 4096 | -1 | Response length | -1 = unlimited, set to cap tokens |
| **seed** | 0+ | 0 | Reproducibility | 0 = random, >0 = deterministic |

**Quick Settings for Common Tasks:**

- **Code Generation**: T=0.2, P=0.8, K=20, R=1.2, M=-1, S=0
- **Creative Writing**: T=1.5, P=0.95, K=50, R=1.3, M=-1, S=0
- **Factual Q&A**: T=0.5, P=0.85, K=30, R=1.1, M=500, S=0
- **Reproducible Tests**: T=0.7, P=0.9, K=40, R=1.1, M=-1, S=42 (any seed >0)

**Visual Indicators**: 
- Core params always shown: `T=0.7 P=0.9 K=40`
- Advanced params shown when non-default: `+ R=1.5 M=500 S=42`

---

## 🎯 Pro Tips

### Blind Mode Best Practices
- **Run multiple rounds**: Vote on 3-5 prompts before revealing for statistically meaningful results
- **Diverse prompts**: Test different task types (reasoning, creativity, factual)
- **Team evaluations**: Share the blind session with colleagues for consensus voting
- **Export before reveal**: Save masked JSON for audit trails showing no bias

### Hyperparameter Experimentation
- **Start with defaults**: Use baseline (0.7, 0.9, 40, 1.1, -1, 0) as control
- **Change one at a time**: Isolate effects by varying single parameter
- **Document results**: Export after each test for comparison
- **Use seed for A/B tests**: Set seed > 0 to ensure identical starting conditions

### Performance Optimization
- **Model size matters**: Smaller models (1B-3B) run faster on CPU, larger (7B+) benefit from GPU
- **Limit num_predict**: Set to 500-1000 for faster responses in testing
- **Batch similar prompts**: Test same prompt across configs before moving to next question

---

## 🧹 Troubleshooting

### Models Not Appearing in Dropdown
```powershell
# Verify Ollama is running
curl http://127.0.0.1:11434/api/tags

# Restart Ollama if needed (Windows)
taskkill /F /IM ollama.exe
ollama serve
```

### Slow Response Times
- **Check GPU usage**: Large models (7B+) slow on CPU-only systems
- **Reduce num_predict**: Set to 500 instead of -1 (unlimited)
- **Use smaller models**: Try `gemma3:1b` or `qwen2.5:3b` instead of `llama3.2:7b`

### Hyperparameters Not Applied
- **Verify in export**: Download JSON and check `model_instances` array
- **Check Ollama version**: Ensure Ollama is up-to-date (v0.1.0+)
- **Restart session**: Click "New Chat" and reconfigure models

### Blind Mode Issues
- **Labels not showing**: Hard refresh browser (Ctrl+F5)
- **Reveal button missing**: Ensure blind mode toggle is active (purple background)
- **Votes not saving**: Check browser console for localStorage errors

---

## 📦 Export Format (v3.0.0)

### Standard Export (Blind Mode Off)
```json
{
  "session_id": "20260127_143022",
  "timestamp": "2026-01-27T14:30:22.123Z",
  "blind_mode": false,
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
  ],
  "history": [
    {
      "prompt": "Explain quantum computing",
      "responses": {
        "gemma3_1b__0.7_0.9_40_1.1_-1_0": {
          "content": "Quantum computing uses qubits...",
          "metrics": {"duration_s": 2.34, "tokens": 150}
        }
      }
    }
  ]
}
```

### Blind Export (Before Reveal)
```json
{
  "session_id": "20260127_143022_blind",
  "blind_mode": true,
  "revealed": false,
  "model_instances": [
    {"id": "MASKED", "model": "MASKED"}
  ],
  "history": [
    {
      "prompt": "Explain quantum computing",
      "responses": {
        "Model A": {"content": "...", "votes": {"up": 1, "down": 0}}
      }
    }
  ]
}
```

### Blind Export (After Reveal)
```json
{
  "blind_mode": true,
  "revealed": true,
  "blind_mapping": {
    "Model A": "gemma3:1b",
    "Model B": "qwen2.5:3b"
  },
  "model_instances": [
    {
      "id": "gemma3_1b__0.7_0.9_40_1.1_-1_0",
      "model": "gemma3:1b",
      "blind_label": "Model A"
    }
  ],
  "vote_summary": {
    "Model A": {"up": 3, "down": 1},
    "Model B": {"up": 5, "down": 0}
  }
}
```

---

## 🆘 Getting Help

- **Issues**: Check [BUG_FIXES.md](BUG_FIXES.md) for known issues
- **API Reference**: See [API.md](API.md) for endpoint details
- **Contributing**: Read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup
- **Changelog**: [CHANGELOG.md](CHANGELOG.md) for version history

---

**Ready to start?** Run `python web_chat.py` and visit http://127.0.0.1:7860 🚀
