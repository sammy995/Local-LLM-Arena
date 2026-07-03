import { describe, expect, it } from "vitest";

import { benchToMarkdown, buildSession, type BenchResult, type PromptResult } from "./benchmark";
import { computeLeaderboard, extractMatches } from "./elo";
import type { ModelInstance } from "./types";

const instances: ModelInstance[] = [
  { id: "a__x", model: "A" },
  { id: "b__x", model: "B" },
];

const perPrompt: PromptResult[] = [
  {
    prompt: "what is 2+2?",
    answers: { a__x: { model: "A", text: "4" }, b__x: { model: "B", text: "5" } },
    verdicts: [
      { label: "X", score: 9, reason: "correct" },
      { label: "Y", score: 2, reason: "wrong" },
    ],
    winner: "X",
    mapping: { X: "a__x", Y: "b__x" },
  },
];

function makeResult(): BenchResult {
  const session = buildSession(perPrompt, instances);
  return {
    perPrompt,
    leaderboard: computeLeaderboard([session]),
    matches: extractMatches([session]),
    judgedCount: 1,
  };
}

describe("benchmark aggregation", () => {
  it("buildSession feeds the Elo engine and ranks the judged winner", () => {
    const board = computeLeaderboard([buildSession(perPrompt, instances)]);
    expect(board[0].model).toBe("A");
    expect(board[0].wins).toBe(1);
  });

  it("benchToMarkdown emits leaderboard with CI plus a win matrix", () => {
    const md = benchToMarkdown(makeResult(), "local · m");
    expect(md).toContain("| # | Model | Elo | 95% CI | W–L–T | Matches |");
    expect(md).toMatch(/\| 1 \| A \|/);
    expect(md).toContain("Win matrix (row beats column)");
    expect(md).toContain("Per-prompt winners");
  });
});
