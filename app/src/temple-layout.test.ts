import { describe, it, expect } from "vitest";
import {
  AVATAR_START,
  COLLIDERS,
  HALL,
  MEDITATION_SEATS,
  groundHeightAt,
} from "./temple-layout";
import { isInside } from "./collision";

describe("groundHeightAt", () => {
  it("is zero on open ground", () => {
    expect(groundHeightAt({ x: 0, z: 8 })).toBe(0);
  });

  it("is the hall platform height on the platform", () => {
    expect(groundHeightAt({ x: 0, z: -2 })).toBe(HALL.platformHeight);
  });

  it("is the step height on the front step", () => {
    expect(groundHeightAt({ x: 0, z: -0.3 })).toBe(HALL.stepHeight);
  });
});

describe("layout sanity", () => {
  it("the avatar starts outside every collider", () => {
    expect(COLLIDERS.some((box) => isInside(AVATAR_START, box))).toBe(false);
  });

  it("every meditation seat is reachable (outside every collider)", () => {
    for (const seat of MEDITATION_SEATS) {
      expect(COLLIDERS.some((box) => isInside(seat, box))).toBe(false);
    }
  });
});
