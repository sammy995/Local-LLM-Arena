import type { Session } from "@/store/arena";

// Cross-session model ranking ("the private Chatbot Arena"). We derive pairwise
// matches from each comparison turn and run a standard Elo update:
//   - if the turn was auto-judged, the judge's scores rank the answers;
//   - otherwise human 👍/👎 votes provide the signal.
// Models are aggregated by name (so the same model at different params share a row).

export interface LeaderRow {
  model: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  matches: number;
}

const K = 24;
const modelFromId = (id: string) => id.split("__")[0];
const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

export function computeLeaderboard(sessions: Session[]): LeaderRow[] {
  const elo = new Map<string, number>();
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const ties = new Map<string, number>();
  const matches = new Map<string, number>();
  const rating = (m: string) => elo.get(m) ?? 1000;
  const bump = (map: Map<string, number>, m: string) => map.set(m, (map.get(m) ?? 0) + 1);

  // process oldest comparisons first so Elo evolves in chronological order
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
          const res = sa > sb ? 1 : sa < sb ? 0 : 0.5; // result for A
          const ra = rating(ma);
          const rb = rating(mb);
          const ea = expected(ra, rb);
          elo.set(ma, ra + K * (res - ea));
          elo.set(mb, rb + K * (1 - res - (1 - ea)));
          bump(matches, ma);
          bump(matches, mb);
          if (res === 1) {
            bump(wins, ma);
            bump(losses, mb);
          } else if (res === 0) {
            bump(losses, ma);
            bump(wins, mb);
          } else {
            bump(ties, ma);
            bump(ties, mb);
          }
        }
      }
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
