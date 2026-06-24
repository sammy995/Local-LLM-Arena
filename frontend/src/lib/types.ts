// Shared API contract — mirrors backend/app/schemas.py. Keep in sync.

export interface ModelInstance {
  id: string; // deterministic: `${model}__${t}_${p}_${k}_${rp}_${np}_${seed}`
  model: string;
  temperature?: number; // 0.01–2.0
  top_p?: number; // 0–1
  top_k?: number; // 0–100
  repeat_penalty?: number; // 1.0–2.0
  num_predict?: number; // -1–4096
  seed?: number; // 0+ (0 = random)
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  system?: string;
  model_instances: ModelInstance[];
}

export interface Metrics {
  eval_tokens: number;
  duration_s: number;
  first_token_s: number | null;
  tokens_per_sec: number;
}

export type StreamEvent =
  | { type: "token"; instance_id: string; token: string }
  | { type: "metrics"; instance_id: string; metrics: Metrics }
  | { type: "done"; instance_id: string; text: string }
  | { type: "error"; instance_id: string; error: string };

export interface ModelInfo {
  name: string;
  size: number | null;
  family: string | null;
  params: string | null;
}
