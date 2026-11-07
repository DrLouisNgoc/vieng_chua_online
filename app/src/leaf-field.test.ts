import { describe, it, expect } from "vitest";
import { createLeafField } from "./leaf-field";

// Deterministic random numbers in [0, 1).
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const sources = [
  { x: 0, z: 0 },
  { x: 50, z: 50 },
];

describe("createLeafField", () => {
  it("starts with the initial leaves", () => {
    const field = createLeafField({ sources, initial: 10, random: seeded(1) });
    expect(field.leaves).toHaveLength(10);
  });

  it("drops one leaf per interval, up to the cap", () => {
    const field = createLeafField({
      sources,
      initial: 0,
      intervalSeconds: 1,
      cap: 3,
      random: seeded(2),
    });
    expect(field.update(0.5)).toBe(false);
    expect(field.leaves).toHaveLength(0);
    expect(field.update(0.6)).toBe(true);
    expect(field.leaves).toHaveLength(1);
    field.update(10);
    expect(field.leaves).toHaveLength(3);
    expect(field.update(10)).toBe(false);
  });

  it("drops leaves within the radius of a source", () => {
    const field = createLeafField({ sources, initial: 200, cap: 200, radius: 4, random: seeded(3) });
    for (const leaf of field.leaves) {
      const near = sources.some((s) => Math.hypot(leaf.x - s.x, leaf.z - s.z) <= 4);
      expect(near).toBe(true);
    }
  });

  it("sweeps away only the leaves in reach", () => {
    const field = createLeafField({ sources, initial: 120, cap: 120, random: seeded(4) });
    const before = field.leaves.length;
    const removed = field.sweep({ x: 0, z: 0 }, 2);
    expect(removed).toBeGreaterThan(0);
    expect(field.leaves).toHaveLength(before - removed);
    for (const leaf of field.leaves) {
      expect(Math.hypot(leaf.x, leaf.z)).toBeGreaterThan(2);
    }
    expect(field.sweep({ x: 200, z: 200 }, 2)).toBe(0);
  });
});
