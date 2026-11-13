import { describe, expect, it } from "vitest";

import type { Box } from "./collision";
import { isInside, resolveMove, resolveMoveInSteps } from "./collision";

const wall: Box = { minX: 0, maxX: 2, minZ: 0, maxZ: 2 };

describe("isInside", () => {
  it("is true for a point within the box", () => {
    expect(isInside({ x: 1, z: 1 }, wall)).toBe(true);
  });

  it("is false for a point outside the box", () => {
    expect(isInside({ x: 3, z: 1 }, wall)).toBe(false);
  });
});

describe("resolveMove", () => {
  it("allows a move into free space", () => {
    expect(resolveMove({ x: -2, z: 1 }, { x: -1, z: 1 }, [wall])).toEqual({
      x: -1,
      z: 1,
    });
  });

  it("slides along a wall instead of entering it", () => {
    // moving diagonally into the wall's left face: x is blocked, z is free
    expect(resolveMove({ x: -0.5, z: 1 }, { x: 0.5, z: 1.5 }, [wall])).toEqual({
      x: -0.5,
      z: 1.5,
    });
  });

  it("stays put when both axes are blocked", () => {
    const corner: Box[] = [wall, { minX: -2, maxX: 2, minZ: 2, maxZ: 4 }];
    expect(resolveMove({ x: -0.5, z: 1.9 }, { x: 0.5, z: 2.5 }, corner)).toEqual({
      x: -0.5,
      z: 1.9,
    });
  });
});

describe("resolveMoveInSteps", () => {
  const thin: Box = { minX: 5, maxX: 5.2, minZ: -10, maxZ: 10 };

  it("does not jump a thin wall when one slow frame at running speed covers more than its thickness", () => {
    // a single resolveMove would land on the far side, 1.2 units on
    expect(resolveMove({ x: 4.8, z: 0 }, { x: 6, z: 0 }, [thin]).x).toBe(6);
    expect(resolveMoveInSteps({ x: 4.8, z: 0 }, { x: 6, z: 0 }, [thin]).x).toBeLessThan(5);
  });

  it("goes the whole way through free space, and slides along a wall like resolveMove", () => {
    const free = resolveMoveInSteps({ x: -5, z: 0 }, { x: -2, z: 0.5 }, [wall]);
    expect(free.x).toBeCloseTo(-2);
    expect(free.z).toBeCloseTo(0.5);
    const slid = resolveMoveInSteps({ x: -0.5, z: 1 }, { x: 0.5, z: 1.5 }, [wall]);
    expect(slid.x).toBeLessThanOrEqual(0);
    expect(slid.z).toBeCloseTo(1.5);
  });
});
