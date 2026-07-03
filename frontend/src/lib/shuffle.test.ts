import { describe, expect, it } from "vitest";

import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("returns a permutation without mutating the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).toHaveLength(5);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it("is deterministic with an injected rng", () => {
    const rng = () => 0;
    expect(shuffle(["a", "b", "c"], rng)).toEqual(shuffle(["a", "b", "c"], rng));
  });
});
