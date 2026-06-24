import { describe, expect, it } from "vitest";

import type { Session } from "@/store/arena";

import { computeLeaderboard } from "./elo";

function session(turns: Session["turns"]): Session {
  return {
    id: "s",
    title: "t",
    createdAt: 1,
    system: "",
    instances: [
      { id: "a__x", model: "A" },
      { id: "b__x", model: "B" },
    ],
    turns,
    blind: { enabled: false, revealed: false, order: [], labels: {} },
  };
}

describe("computeLeaderboard", () => {
  it("ranks the judged winner above the loser", () => {
    const board = computeLeaderboard([
      session([
        {
          id: "t1",
          user: "q",
          prompt: "q",
          responses: {
            a__x: { text: "x", streaming: false, vote: 0 },
            b__x: { text: "y", streaming: false, vote: 0 },
          },
          judge: {
            loading: false,
            by: "local·m",
            mapping: { X: "a__x", Y: "b__x" },
            verdicts: [
              { label: "X", score: 9, reason: "" },
              { label: "Y", score: 4, reason: "" },
            ],
            winner: "X",
          },
        },
      ]),
    ]);
    expect(board[0].model).toBe("A");
    expect(board[0].elo).toBeGreaterThan(1000);
    expect(board[0].wins).toBe(1);
    const b = board.find((r) => r.model === "B")!;
    expect(b.losses).toBe(1);
    expect(b.elo).toBeLessThan(1000);
  });

  it("uses 👍/👎 votes when no judge is present", () => {
    const board = computeLeaderboard([
      session([
        {
          id: "t1",
          user: "q",
          prompt: "q",
          responses: {
            a__x: { text: "x", streaming: false, vote: 1 },
            b__x: { text: "y", streaming: false, vote: -1 },
          },
        },
      ]),
    ]);
    expect(board[0].model).toBe("A");
    expect(board[0].wins).toBe(1);
  });
});
