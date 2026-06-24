import { describe, expect, it } from "vitest";

import { DEFAULT_HP, makeInstance, makeInstanceId, paramSummary } from "./instance";

describe("instance helpers", () => {
  it("makeInstanceId is deterministic and parameter-sensitive", () => {
    const a = makeInstanceId("gemma3:1b", { ...DEFAULT_HP });
    const b = makeInstanceId("gemma3:1b", { ...DEFAULT_HP });
    const c = makeInstanceId("gemma3:1b", { ...DEFAULT_HP, temperature: 0.1 });
    expect(a).toBe(b); // same model + params => same id (blocks duplicates)
    expect(a).not.toBe(c); // different temp => distinct entry (multi-config)
  });

  it("paramSummary shows core always, advanced only when non-default", () => {
    expect(paramSummary(makeInstance("m", { ...DEFAULT_HP }))).toBe("T0.7 P0.9 K40");
    const adv = paramSummary(makeInstance("m", { ...DEFAULT_HP, repeat_penalty: 1.5, seed: 42 }));
    expect(adv).toContain("R1.5");
    expect(adv).toContain("S42");
  });
});
