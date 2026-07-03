// Fisher–Yates, non-mutating. `rng` is injectable so tests can be deterministic.
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
