# Ollama Arena API Documentation (v3.0.0)

> **Note**: This API interfaces with [Ollama](https://ollama.ai) (© Ollama, Inc.) for local model inference. All API calls route through Ollama's local service at `http://localhost:11434`. Ollama is licensed under the [MIT License](https://github.com/ollama/ollama/blob/main/LICENSE).

## Base URL
```
http://127.0.0.1:7860/api
```

## Authentication

If `WEB_CHAT_TOKEN` environment variable is set, include Bearer token:

```http
Authorization: Bearer your-token-here
```

## Endpoints

### Health Check

**GET** `/api/health`

Check service health status.

**Response 200:**
```json
{
  "status": "healthy",
  "service": "ollama-arena",
  "models_available": 5
}
```

---

### List Models

**GET** `/api/models`

Get all available Ollama models.

**Response 200:**
```json
{
  "models": [
    "llama3.2:3b",
    "qwen2.5:7b",
    "mistral:7b"
  ]
}
```

**Response 401:** (if authentication fails)
```json
{
  "error": "Missing or invalid Authorization header"
}
```

---

### Chat (Non-Streaming)

**POST** `/api/chat`

Send message(s) to one or more models with optional hyperparameters.

#### Legacy Format (Deprecated)

```json
{
  "history": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is 2+2?"}
  ],
  "models": ["llama3.2:3b", "qwen2.5:3b"],
  "stream": false
}
```

#### Recommended Format (v3.0.0+)

```json
{
  "history": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is 2+2?"}
  ],
  "model_instances": [
    {
      "id": "llama3_2_3b__0.7_0.9_40_1.1_-1_0",
      "model": "llama3.2:3b",
      "temperature": 0.7,
      "top_p": 0.9,
      "top_k": 40,
      "repeat_penalty": 1.1,
      "num_predict": -1,
      "seed": 0
    },
    {
      "id": "qwen2_5_3b__0.5_0.8_30_1.2_500_42",
      "model": "qwen2.5:3b",
      "temperature": 0.5,
      "top_p": 0.8,
      "top_k": 30,
      "repeat_penalty": 1.2,
      "num_predict": 500,
      "seed": 42
    }
  ],
  "stream": false
}
```

**Parameters:**
- `history` (array): List of message objects with `role` and `content`
- `models` (array, deprecated): List of model names (use `model_instances` instead)
- `model_instances` (array, recommended): List of model configurations with hyperparameters
  - `id` (string): Unique instance identifier (format: `{model}__{temp}_{p}_{k}_{repeat}_{predict}_{seed}`)
  - `model` (string): Model name from Ollama
  - `temperature` (float, optional): 0.01-2.0, default 0.7
  - `top_p` (float, optional): 0-1, default 0.9
  - `top_k` (int, optional): 0-100, default 40
  - `repeat_penalty` (float, optional): 1.0-2.0, default 1.1
  - `num_predict` (int, optional): -1 to 4096, default -1 (unlimited)
  - `seed` (int, optional): 0+ for reproducibility, default 0 (random)
- `stream` (boolean): Whether to stream response (use `/stream_chat` instead)

**Response 200 (Single Model):**
```json
{
  "model": "llama3.2:3b",
  "instance_id": "llama3_2_3b__0.7_0.9_40_1.1_-1_0",
  "response": "2 + 2 equals 4.",
  "metrics": {
    "tokens": 8,
    "duration_s": 0.42,
    "tokens_per_sec": 19.05
  }
}
```

**Response 200 (Multiple Models with Hyperparameters):**
```json
{
  "results": {
    "llama3_2_3b__0.7_0.9_40_1.1_-1_0": {
      "response": "The answer is 4. This is a basic arithmetic calculation.",
      "metrics": {
        "tokens": 12,
        "duration_s": 0.53,
        "tokens_per_sec": 22.64
      }
    },
    "qwen2_5_3b__0.5_0.8_30_1.2_500_42": {
      "response": "2 + 2 = 4",
      "metrics": {
        "tokens": 5,
        "duration_s": 0.31,
        "tokens_per_sec": 16.13
      }
    }
  }
}
```

**Note:** Results are keyed by `instance_id` instead of `model` name to support same-model-different-configs testing.


**Response 400:**
```json
{
  "error": "No messages provided"
}
```

**Response 400 (Duplicate Instance):**
```json
{
  "error": "Duplicate model instance detected: llama3_2_3b__0.7_0.9_40_1.1_-1_0"
}
```

---

### Stream Chat

**POST** `/api/stream_chat`

Stream responses from multiple models in real-time with hyperparameter support.

#### Legacy Format (Deprecated)

```json
{
  "history": [
    {"role": "user", "content": "Tell me a story"}
  ],
  "models": ["llama3.2:3b", "qwen2.5:3b"]
}
```

#### Recommended Format (v3.0.0+)

```json
{
  "history": [
    {"role": "user", "content": "Tell me a story"}
  ],
  "model_instances": [
    {
      "id": "llama3_2_3b__0.7_0.9_40_1.1_-1_0",
      "model": "llama3.2:3b",
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

**Response 200 (NDJSON Stream):**

Each line is a JSON object:

```json
{"instance_id": "llama3_2_3b__0.7_0.9_40_1.1_-1_0", "token": "Once", "done": false}
{"instance_id": "qwen2_5_3b__0.5_0.8_30_1.2_500_42", "token": "There", "done": false}
{"instance_id": "llama3_2_3b__0.7_0.9_40_1.1_-1_0", "token": " upon", "done": false}
{"instance_id": "llama3_2_3b__0.7_0.9_40_1.1_-1_0", "token": "", "done": true, "metrics": {"tokens": 150, "duration_s": 3.2}}
{"instance_id": "qwen2_5_3b__0.5_0.8_30_1.2_500_42", "token": "", "done": true, "metrics": {"tokens": 120, "duration_s": 2.8}}
```

**Token Object:**
- `instance_id` (string): Model instance identifier (or `model` for legacy format)
- `token` (string): Text chunk (empty when done)
- `done` (boolean): True when model finishes
- `metrics` (object, optional): Included in final token when `done=true`
  - `tokens` (int): Total tokens generated
  - `duration_s` (float): Total generation time
- `error` (string, optional): Error message if failed

---

### Pull Model

**POST** `/api/pull_model`

Download a model from Ollama registry (async operation).

**Request Body:**
```json
{
  "model": "deepseek-r1:8b"
}
```

**Response 200:**
```json
{
  "status": "downloading",
  "model": "deepseek-r1:8b"
}
```

**Response 400:**
```json
{
  "error": "Model name is required"
}
```

**Note:** This is an async operation. Poll `/api/models` to check when download completes.

---

### Delete Model

**POST** `/api/delete_model`

Remove a model from local storage.

**Request Body:**
```json
{
  "model": "llama2:7b"
}
```

**Response 200:**
```json
{
  "status": "deleted",
  "model": "llama2:7b"
}
```

**Response 500:**
```json
{
  "error": "Failed to delete model"
}
```

---

## Error Responses

All endpoints may return:

**401 Unauthorized:**
```json
{
  "error": "Invalid authorization token"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "An unexpected error occurred",
  "details": "Connection refused"
}
```

---

## Rate Limiting

Currently no rate limiting. Configure in production as needed.

## CORS

CORS is not enabled by default. Add middleware in `app/__init__.py` if needed.

## Examples

### cURL Examples

**List models:**
```bash
curl http://localhost:7860/api/models
```

**Chat with authentication:**
```bash
curl -X POST http://localhost:7860/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "history": [{"role": "user", "content": "Hello!"}],
    "models": ["llama3.2:3b"]
  }'
```

**Stream chat:**
```bash
curl -X POST http://localhost:7860/api/stream_chat \
  -H "Content-Type: application/json" \
  -d '{
    "history": [{"role": "user", "content": "Count to 5"}],
    "models": ["llama3.2:3b"]
  }'
```

### Python Examples

```python
import requests

# List models
response = requests.get('http://localhost:7860/api/models')
models = response.json()['models']

# Chat
response = requests.post('http://localhost:7860/api/chat', json={
    'history': [{'role': 'user', 'content': 'Hello!'}],
    'models': ['llama3.2:3b']
})
result = response.json()

# Stream chat
response = requests.post(
    'http://localhost:7860/api/stream_chat',
    json={
        'history': [{'role': 'user', 'content': 'Tell me a story'}],
        'models': ['llama3.2:3b']
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        token = json.loads(line)
        print(token['model'], token['token'], end='', flush=True)
```

### JavaScript Examples

```javascript
// List models
const models = await fetch('/api/models')
  .then(r => r.json())
  .then(data => data.models);

// Chat
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    history: [{role: 'user', content: 'Hello!'}],
    models: ['llama3.2:3b']
  })
});
const result = await response.json();

// Stream chat
const response = await fetch('/api/stream_chat', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    history: [{role: 'user', content: 'Tell me a story'}],
    models: ['llama3.2:3b']
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const {done, value} = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const token = JSON.parse(line);
    console.log(token.model, token.token);
  }
}
```
