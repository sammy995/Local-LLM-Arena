# Ollama Arena API Documentation

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

Send message(s) to one or more models.

**Request Body:**
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

**Parameters:**
- `history` (array): List of message objects with `role` and `content`
- `models` (array): List of model names to query
- `stream` (boolean): Whether to stream response (use `/stream_chat` instead)

**Response 200 (Single Model):**
```json
{
  "model": "llama3.2:3b",
  "response": "2 + 2 equals 4.",
  "metrics": {
    "tokens": 8,
    "duration_s": 0.42,
    "tokens_per_sec": 19.05
  }
}
```

**Response 200 (Multiple Models):**
```json
{
  "results": {
    "llama3.2:3b": {
      "model": "llama3.2:3b",
      "response": "2 + 2 equals 4.",
      "metrics": {
        "tokens": 8,
        "duration_s": 0.42,
        "tokens_per_sec": 19.05
      },
      "error": null
    },
    "qwen2.5:3b": {
      "model": "qwen2.5:3b",
      "response": "The answer is 4.",
      "metrics": {
        "tokens": 6,
        "duration_s": 0.35,
        "tokens_per_sec": 17.14
      },
      "error": null
    }
  }
}
```

**Response 400:**
```json
{
  "error": "No messages provided"
}
```

---

### Stream Chat

**POST** `/api/stream_chat`

Stream responses from multiple models in real-time.

**Request Body:**
```json
{
  "history": [
    {"role": "user", "content": "Tell me a story"}
  ],
  "models": ["llama3.2:3b", "qwen2.5:3b"]
}
```

**Response 200 (NDJSON Stream):**

Each line is a JSON object:

```json
{"model": "llama3.2:3b", "token": "Once", "done": false}
{"model": "qwen2.5:3b", "token": "There", "done": false}
{"model": "llama3.2:3b", "token": " upon", "done": false}
{"model": "llama3.2:3b", "token": "", "done": true}
{"model": "qwen2.5:3b", "token": "", "done": true}
```

**Token Object:**
- `model` (string): Model name
- `token` (string): Text chunk (empty when done)
- `done` (boolean): True when model finishes
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
