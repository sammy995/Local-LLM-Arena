import { describe, expect, it } from "vitest";

import { persistedState, useArena } from "./arena";

// Note: importing the store in Node logs a zustand "storage unavailable" warning —
// harmless here; persistence is exercised via persistedState directly.
describe("persistence", () => {
  it("never writes the judge API key to storage", () => {
    useArena.setState({
      judgeConfig: { provider: "openrouter", model: "m", apiKey: "sk-secret", baseUrl: "" },
    });
    const persisted = persistedState(useArena.getState());
    expect(persisted.judgeConfig.apiKey).toBe("");
    expect(persisted.judgeConfig.model).toBe("m");
    expect(persisted.sessions.length).toBeGreaterThan(0);
  });
});
