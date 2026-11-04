import { describe, it, expect } from "vitest";
import {
  AVATAR_START,
  BAMBOO_CLUMPS,
  BELL_TOWER,
  BOUNDARY,
  BROADLEAF_TREES,
  COLLIDERS,
  COURTYARD,
  GATE,
  HALL,
  MEDITATION_SEATS,
  PATH,
  PAVING_HEIGHT,
  PINE_POSITIONS,
  POND,
  STAIRS,
  STONE_PILLARS,
  URN,
  groundHeightAt,
} from "./temple-layout";
import { isInside } from "./collision";

const stairsFoot = STAIRS.frontZ + STAIRS.count * STAIRS.tread;

describe("groundHeightAt", () => {
  it("is the paving height anywhere in the paved yard", () => {
    expect(groundHeightAt({ x: 0, z: 30 })).toBe(PAVING_HEIGHT);
    expect(groundHeightAt({ x: -70, z: 80 })).toBe(PAVING_HEIGHT);
  });

  it("is zero outside the perimeter wall", () => {
    expect(groundHeightAt({ x: 0, z: BOUNDARY.maxZ + 10 })).toBe(0);
  });

  it("is the hall platform height on the platform", () => {
    expect(groundHeightAt({ x: 0, z: -3 })).toBe(HALL.platformHeight);
  });
});

describe("main hall stairs (owner 2026-11-04: raised 9 steps)", () => {
  it("has 9 steps and the platform sits 9 risers up", () => {
    expect(STAIRS.count).toBe(9);
    expect(HALL.platformHeight).toBeCloseTo(STAIRS.count * STAIRS.rise);
  });

  it("the bottom step is one riser high and the top step is level with the platform", () => {
    expect(groundHeightAt({ x: 0, z: stairsFoot - STAIRS.tread / 2 })).toBeCloseTo(STAIRS.rise);
    expect(groundHeightAt({ x: 0, z: STAIRS.frontZ + STAIRS.tread / 2 })).toBeCloseTo(
      HALL.platformHeight,
    );
  });

  it("climbs steadily: each step toward the hall is one riser higher", () => {
    let previous = 0;
    for (let k = STAIRS.count - 1; k >= 0; k -= 1) {
      const h = groundHeightAt({ x: 0, z: STAIRS.frontZ + (k + 0.5) * STAIRS.tread });
      expect(h - previous).toBeCloseTo(STAIRS.rise);
      previous = h;
    }
  });

  it("the platform edges block walking up except over the stairs", () => {
    const blocked = (x: number, z: number): boolean =>
      COLLIDERS.some((box) => isInside({ x, z }, box));
    expect(blocked(HALL.maxX - 0.1, -10)).toBe(true); // right side edge
    expect(blocked(-20, HALL.maxZ - 0.1)).toBe(true); // front edge beside the stairs
    expect(blocked(0, HALL.maxZ - 0.1)).toBe(false); // top of the stairs
  });

  it("keeps the start point, urn and stone pillars off the stairs", () => {
    const stairs = { minX: STAIRS.minX, maxX: STAIRS.maxX, minZ: STAIRS.frontZ, maxZ: stairsFoot };
    for (const p of [AVATAR_START, URN, ...STONE_PILLARS]) {
      expect(isInside(p, stairs)).toBe(false);
    }
  });
});

describe("grounds features", () => {
  it("raises the avatar onto the bell tower platform", () => {
    expect(groundHeightAt(BELL_TOWER)).toBe(BELL_TOWER.platformHeight);
  });

  it("leaves the gate's central opening walkable", () => {
    expect(COLLIDERS.some((box) => isInside({ x: 0, z: GATE.z }, box))).toBe(false);
  });

  it("closes the perimeter: the wall blocks a point on its line away from the gate", () => {
    expect(COLLIDERS.some((box) => isInside({ x: 30, z: BOUNDARY.maxZ }, box))).toBe(true);
    expect(COLLIDERS.some((box) => isInside({ x: 0, z: BOUNDARY.minZ }, box))).toBe(true);
  });

  it("keeps trees and bamboo off the path, the courtyard, the pond and the hall", () => {
    const keepClear = [
      { minX: -PATH.width, maxX: PATH.width, minZ: PATH.toZ, maxZ: PATH.fromZ },
      COURTYARD,
      HALL,
      POND,
    ];
    for (const p of [...BROADLEAF_TREES, ...BAMBOO_CLUMPS, ...PINE_POSITIONS]) {
      expect(keepClear.some((box) => isInside(p, box))).toBe(false);
    }
  });

  it("the lotus pond is a rectangle beside the hall", () => {
    expect(POND.minX).toBeGreaterThan(HALL.maxX);
    // overlaps the hall's depth, i.e. it sits alongside it
    expect(POND.minZ).toBeLessThan(HALL.maxZ);
    expect(POND.maxZ).toBeGreaterThan(HALL.minZ);
    expect(COLLIDERS.some((box) => isInside({ x: (POND.minX + POND.maxX) / 2, z: (POND.minZ + POND.maxZ) / 2 }, box))).toBe(true);
  });
});

describe("yard size", () => {
  // Owner 2026-11-04: first front x10 / sides x5 (front 210, sides 85),
  // then "halve the area" between the wall and the hall.
  const yardArea = (front: number, side: number, back: number): number =>
    (HALL.maxX - HALL.minX + 2 * side) * (HALL.maxZ - HALL.minZ + front + back) -
    (HALL.maxX - HALL.minX) * (HALL.maxZ - HALL.minZ);

  it("the yard between wall and hall is about half its previous area", () => {
    const previous = yardArea(210, 85, 15);
    const now = yardArea(
      BOUNDARY.maxZ - HALL.maxZ,
      HALL.minX - BOUNDARY.minX,
      HALL.minZ - BOUNDARY.minZ,
    );
    expect(now / previous).toBeGreaterThan(0.47);
    expect(now / previous).toBeLessThan(0.53);
  });

  it("small pine trees stand outside the perimeter wall", () => {
    for (const pine of PINE_POSITIONS) {
      expect(isInside(pine, BOUNDARY)).toBe(false);
    }
  });

  it("broadleaf trees and bamboo stay inside the wall", () => {
    for (const tree of [...BROADLEAF_TREES, ...BAMBOO_CLUMPS]) {
      expect(isInside(tree, BOUNDARY)).toBe(true);
    }
  });

  it("the path reaches from the courtyard out through the gate", () => {
    expect(PATH.toZ).toBeLessThanOrEqual(COURTYARD.maxZ);
    expect(PATH.fromZ).toBeGreaterThan(GATE.z);
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
