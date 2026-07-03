import { describe, expect, it } from "vitest";

import type { Session } from "@/store/arena";

import {
  bootstrapCI,
  computeLeaderboard,
  eloFromMatches,
  extractMatches,
  winMatrix,
  type Match,
} from "./elo";

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

const judgedTurn: Session["turns"][number] = {
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
};

// Deterministic rng for the bootstrap test.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("computeLeaderboard", () => {
  it("ranks the judged winner above the loser", () => {
    const board = computeLeaderboard([session([judgedTurn])]);
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

describe("extractMatches", () => {
  it("derives one decisive match from a judged turn", () => {
    expect(extractMatches([session([judgedTurn])])).toEqual([{ a: "A", b: "B", result: 1 }]);
  });
});

describe("eloFromMatches", () => {
  it("applies one K=24 update from a 1000-1000 start", () => {
    const board = eloFromMatches([{ a: "A", b: "B", result: 1 }]);
    expect(board[0]).toMatchObject({ model: "A", elo: 1012, wins: 1 });
    expect(board[1]).toMatchObject({ model: "B", elo: 988, losses: 1 });
  });
});

describe("bootstrapCI", () => {
  it("is empty when there are no matches", () => {
    expect(bootstrapCI([]).size).toBe(0);
  });

  it("puts a consistent winner's whole interval above 1000", () => {
    const ms: Match[] = Array.from({ length: 10 }, () => ({ a: "A", b: "B", result: 1 }));
    const ci = bootstrapCI(ms, 50, mulberry32(1));
    const a = ci.get("A")!;
    expect(a.lo).toBeGreaterThan(1000);
    expect(a.lo).toBeLessThanOrEqual(a.hi);
    expect(ci.get("B")!.hi).toBeLessThan(1000);
  });
});

describe("winMatrix", () => {
  it("counts decisive wins only (ties excluded)", () => {
    const { models, wins } = winMatrix([
      { a: "A", b: "B", result: 1 },
      { a: "A", b: "B", result: 0.5 },
      { a: "B", b: "A", result: 1 },
    ]);
    expect(models).toEqual(["A", "B"]);
    expect(wins["A"]["B"]).toBe(1);
    expect(wins["B"]["A"]).toBe(1);
  });
});
