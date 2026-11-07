import { describe, it, expect } from "vitest";
import { approach, approachAngle, smoothingFactor } from "./remote-motion";

describe("smoothingFactor", () => {
  it("is 0 for no time and tends to 1 for long gaps", () => {
    expect(smoothingFactor(0)).toBe(0);
    expect(smoothingFactor(10)).toBeCloseTo(1);
    expect(smoothingFactor(1 / 60)).toBeGreaterThan(0.1);
  });
});

describe("approach", () => {
  it("moves part of the way toward the target", () => {
    expect(approach(0, 4, 0.25)).toBeCloseTo(1);
  });

  it("jumps when the gap is a teleport (reconnect, seat snap far away)", () => {
    expect(approach(0, 50, 0.1)).toBe(50);
  });
});

describe("approachAngle", () => {
  it("turns the short way round across ±PI", () => {
    const next = approachAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
    // halfway along the 0.2 rad short arc, i.e. exactly at PI
    expect(Math.abs(Math.cos(next) - Math.cos(Math.PI))).toBeLessThan(1e-9);
  });

  it("reaches the target at factor 1", () => {
    expect(Math.sin(approachAngle(0.3, 2.0, 1))).toBeCloseTo(Math.sin(2.0));
  });
});
