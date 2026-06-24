import type { StreamEvent } from "./types";

// Reads an NDJSON (application/x-ndjson) stream and calls onEvent per line.
// Buffers partial lines across chunks.
export async function readNdjson(
  res: Response,
  onEvent: (e: StreamEvent) => void,
): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as StreamEvent);
    }
  }
  const last = buffer.trim();
  if (last) onEvent(JSON.parse(last) as StreamEvent);
}
