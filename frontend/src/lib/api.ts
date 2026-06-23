import type { ChatRequest, ModelInfo } from "./types";

// Optional bearer token (set window.__ARENA_TOKEN__ if backend requires it).
function headers(): HeadersInit {
  const token = (globalThis as { __ARENA_TOKEN__?: string }).__ARENA_TOKEN__;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

export async function listModels(): Promise<ModelInfo[]> {
  const r = await fetch("/api/models", { headers: headers() });
  if (!r.ok) throw new Error(`GET /api/models -> ${r.status}`);
  return (await r.json()).models;
}

export async function health(): Promise<{ status: string; ollama_reachable: boolean }> {
  return (await fetch("/api/health")).json();
}

// Returns the raw streaming Response; pass to readNdjson() in sse.ts.
export async function streamChat(body: ChatRequest, signal?: AbortSignal): Promise<Response> {
  const r = await fetch("/api/chat/stream", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok || !r.body) throw new Error(`POST /api/chat/stream -> ${r.status}`);
  return r;
}

export async function pullModel(model: string): Promise<void> {
  const r = await fetch("/api/models/pull", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ model }),
  });
  if (!r.ok) throw new Error(`pull ${model} -> ${r.status}`);
}

export async function deleteModel(name: string): Promise<void> {
  const r = await fetch(`/api/models/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!r.ok) throw new Error(`delete ${name} -> ${r.status}`);
}
