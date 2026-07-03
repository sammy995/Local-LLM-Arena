import { describe, expect, it } from "vitest";

import { assignLabels } from "./benchmark";

describe("assignLabels", () => {
  it("maps every id to exactly one label", () => {
    const { order, mapping } = assignLabels(["x", "y", "z"]);
    expect(order).toHaveLength(3);
    expect(Object.keys(mapping).sort()).toEqual(["A", "B", "C"]);
    expect(Object.values(mapping).sort()).toEqual(["x", "y", "z"]);
    for (const { label, id } of order) expect(mapping[label]).toBe(id);
  });

  it("orders candidates by the rng, not by input position (position-bias fix)", () => {
    // rng that always returns 0 rotates [x,y,z] -> [y,z,x]
    const a = assignLabels(["x", "y", "z"], () => 0);
    expect(a.order.map((o) => o.id)).toEqual(["y", "z", "x"]);
  });
});
