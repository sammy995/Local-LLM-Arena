import type { Session } from "@/store/arena";

// Cross-session model ranking ("the private Chatbot Arena"). Comparison turns are
// flattened into pairwise matches (judge scores rank answers when present, else
// human 👍/👎 votes), then a standard Elo update runs over the match list.
// Models are aggregated by name (same model at different params share a row).

export interface LeaderRow {
  model: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  matches: number;
}

/** One pairwise comparison. `result` is for model `a`: 1 win, 0 loss, 0.5 tie. */
export interface Match {
  a: string;
  b: string;
  result: number;
}

export interface EloInterval {
  lo: number;
  hi: number;
}

const K = 24;
const modelFromId = (id: string) => id.split("__")[0];
const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

/** Flatten sessions (oldest first, so Elo evolves chronologically) into matches. */
export function extractMatches(sessions: Session[]): Match[] {
  const out: Match[] = [];
  const ordered = [...sessions].sort((a, b) => a.createdAt - b.createdAt);
  for (const s of ordered) {
    const nameOf = (id: string) => s.instances.find((i) => i.id === id)?.model ?? modelFromId(id);
    for (const turn of s.turns) {
      // model name -> signal score for this turn
      const scores = new Map<string, number>();
      if (turn.judge?.verdicts?.length) {
        for (const v of turn.judge.verdicts) {
          const id = turn.judge.mapping[v.label];
          if (id) scores.set(nameOf(id), v.score);
        }
      } else {
        for (const [id, r] of Object.entries(turn.responses)) {
          if (r.vote === 1 || r.vote === -1) scores.set(nameOf(id), r.vote);
        }
      }
      const entries = [...scores.entries()];
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const [ma, sa] = entries[i];
          const [mb, sb] = entries[j];
          if (ma === mb) continue;
          out.push({ a: ma, b: mb, result: sa > sb ? 1 : sa < sb ? 0 : 0.5 });
        }
      }
    }
  }
  return out;
}

export function eloFromMatches(ms: Match[]): LeaderRow[] {
  const elo = new Map<string, number>();
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const ties = new Map<string, number>();
  const matches = new Map<string, number>();
  const rating = (m: string) => elo.get(m) ?? 1000;
  const bump = (map: Map<string, number>, m: string) => map.set(m, (map.get(m) ?? 0) + 1);

  for (const m of ms) {
    const ra = rating(m.a);
    const rb = rating(m.b);
    const ea = expected(ra, rb);
    elo.set(m.a, ra + K * (m.result - ea));
    elo.set(m.b, rb + K * (1 - m.result - (1 - ea)));
    bump(matches, m.a);
    bump(matches, m.b);
    if (m.result === 1) {
      bump(wins, m.a);
      bump(losses, m.b);
    } else if (m.result === 0) {
      bump(losses, m.a);
      bump(wins, m.b);
    } else {
      bump(ties, m.a);
      bump(ties, m.b);
    }
  }

  return [...elo.keys()]
    .map((m) => ({
      model: m,
      elo: Math.round(rating(m)),
      wins: wins.get(m) ?? 0,
      losses: losses.get(m) ?? 0,
      ties: ties.get(m) ?? 0,
      matches: matches.get(m) ?? 0,
    }))
    .sort((a, b) => b.elo - a.elo);
}

export function computeLeaderboard(sessions: Session[]): LeaderRow[] {
  return eloFromMatches(extractMatches(sessions));
}

/** 95% bootstrap confidence interval per model: resample the match list with
 *  replacement, recompute Elo each time, take the 2.5th/97.5th percentiles. */
export function bootstrapCI(
  ms: Match[],
  iterations = 200,
  rng: () => number = Math.random,
): Map<string, EloInterval> {
  const out = new Map<string, EloInterval>();
  if (!ms.length) return out;
  const samples = new Map<string, number[]>();
  for (let it = 0; it < iterations; it++) {
    const resampled: Match[] = [];
    for (let i = 0; i < ms.length; i++) resampled.push(ms[Math.floor(rng() * ms.length)]);
    for (const row of eloFromMatches(resampled)) {
      const arr = samples.get(row.model);
      if (arr) arr.push(row.elo);
      else samples.set(row.model, [row.elo]);
    }
  }
  for (const [model, arr] of samples) {
    arr.sort((x, y) => x - y);
    const at = (p: number) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
    out.set(model, { lo: Math.round(at(0.025)), hi: Math.round(at(0.975)) });
  }
  return out;
}

/** Decisive wins per ordered pair: wins[a][b] = times a beat b (ties excluded). */
export function winMatrix(ms: Match[]): {
  models: string[];
  wins: Record<string, Record<string, number>>;
} {
  const models = [...new Set(ms.flatMap((m) => [m.a, m.b]))].sort();
  const wins: Record<string, Record<string, number>> = {};
  for (const a of models) {
    wins[a] = {};
    for (const b of models) wins[a][b] = 0;
  }
  for (const m of ms) {
    if (m.result === 1) wins[m.a][m.b] += 1;
    else if (m.result === 0) wins[m.b][m.a] += 1;
  }
  return { models, wins };
}
