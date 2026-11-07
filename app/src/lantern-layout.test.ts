import { describe, it, expect } from "vitest";
import { isInside } from "./collision";
import {
  BOUNDARY,
  BROADLEAF_TREES,
  COLLIDERS,
  HALL,
  HALL_LANTERNS,
  LANTERN_LIGHTS,
  LANTERN_POSTS,
  PATH,
  STONE_PILLARS,
} from "./temple-layout";

describe("lantern layout", () => {
  it("puts posts beside the path, inside the wall, clear of pillars and trees", () => {
    expect(LANTERN_POSTS.length).toBeGreaterThan(6);
    for (const post of LANTERN_POSTS) {
      expect(Math.abs(post.x)).toBeGreaterThan(PATH.width / 2 + 0.5);
      expect(isInside(post, BOUNDARY)).toBe(true);
      for (const other of [...STONE_PILLARS, ...BROADLEAF_TREES]) {
        expect(Math.hypot(post.x - other.x, post.z - other.z)).toBeGreaterThan(1.5);
      }
    }
  });

  it("gives every post a collider", () => {
    for (const post of LANTERN_POSTS) {
      expect(COLLIDERS.some((box) => isInside(post, box))).toBe(true);
    }
  });

  it("hangs one lantern on each front pillar of the hall, in front of it", () => {
    expect(HALL_LANTERNS).toHaveLength(HALL.frontPillarXs.length);
    for (const lantern of HALL_LANTERNS) {
      expect(HALL.frontPillarXs).toContain(lantern.x);
      expect(lantern.z).toBeGreaterThan(HALL.frontPillarZ);
      expect(lantern.y).toBeGreaterThan(HALL.platformHeight + 2);
    }
  });

  it("uses at most four real lights", () => {
    expect(LANTERN_LIGHTS.length).toBeLessThanOrEqual(4);
  });
});
