import { describe, expect, it } from "vitest";

import { readNdjson } from "./sse";
import type { StreamEvent } from "./types";

function ndjson(chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const chunk of chunks) c.enqueue(new TextEncoder().encode(chunk));
      c.close();
    },
  });
  return new Response(body);
}

describe("readNdjson", () => {
  it("parses events split across chunk boundaries", async () => {
    const events: StreamEvent[] = [];
    const res = ndjson([
      '{"type":"token","instance_id":"a","to', // object split mid-key
      'ken":"hi"}\n{"type":"done","instance_id":"a","text":"hi"}\n',
    ]);
    await readNdjson(res, (e) => events.push(e));
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: "token", token: "hi" });
    expect(events[1].type).toBe("done");
  });

  it("handles a trailing line with no newline", async () => {
    const events: StreamEvent[] = [];
    const res = ndjson([
      '{"type":"metrics","instance_id":"a","metrics":{"eval_tokens":3,"duration_s":1,"first_token_s":0.1,"tokens_per_sec":3}}',
    ]);
    await readNdjson(res, (e) => events.push(e));
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("metrics");
  });
});
