import { describe, it, expect } from "vitest";
import { isInside, resolveMove, type Box } from "./collision";

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
    const corner: Box[] = [
      wall,
      { minX: -2, maxX: 2, minZ: 2, maxZ: 4 },
    ];
    expect(resolveMove({ x: -0.5, z: 1.9 }, { x: 0.5, z: 2.5 }, corner)).toEqual({
      x: -0.5,
      z: 1.9,
    });
  });
});
