import { describe, expect, it } from "vitest";

import { isInside, resolveMove } from "./collision";
import {
  AVATAR_START,
  BAMBOO_CLUMPS,
  BELL_TOWER,
  BOUNDARY,
  BROADLEAF_TREES,
  COLLIDERS,
  COURTYARD,
  EAST_GATE,
  GATE,
  groundHeightAt,
  HALL,
  MEDITATION_SEATS,
  PAGODA,
  PAGODA_HALL_FLOOR,
  PAGODA_PLAZA,
  pagodaToWorld,
  PATH,
  PAVING_HEIGHT,
  PINE_POSITIONS,
  POND,
  STAIRS,
  STONE_PILLARS,
  URN,
} from "./temple-layout";

const stairsFoot = STAIRS.frontZ + STAIRS.count * STAIRS.tread;

function isBlocked(x: number, z: number): boolean {
  return COLLIDERS.some((box) => isInside({ x, z }, box));
}

// Walks in 0.2 steps in a straight line, each step from where the avatar actually is
// (like a frame of walking), so a wall or collider stops it as it does in the game.
function walk(from: { x: number; z: number }, to: { x: number; z: number }) {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const step = { x: ((to.x - from.x) / distance) * 0.2, z: ((to.z - from.z) / distance) * 0.2 };
  let at = from;
  for (let i = 0; i < Math.ceil(distance / 0.2); i += 1) {
    at = resolveMove(at, { x: at.x + step.x, z: at.z + step.z }, COLLIDERS);
  }
  return at;
}

function yardArea(front: number, side: number, back: number): number {
  return (
    (HALL.maxX - HALL.minX + 2 * side) * (HALL.maxZ - HALL.minZ + front + back) -
    (HALL.maxX - HALL.minX) * (HALL.maxZ - HALL.minZ)
  );
}

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
    expect(groundHeightAt({ x: 0, z: STAIRS.frontZ + STAIRS.tread / 2 })).toBeCloseTo(HALL.platformHeight);
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
    expect(isBlocked(HALL.maxX - 0.1, -10)).toBe(true); // right side edge
    expect(isBlocked(-20, HALL.maxZ - 0.1)).toBe(true); // front edge beside the stairs
    expect(isBlocked(0, HALL.maxZ - 0.1)).toBe(false); // top of the stairs
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
    expect(
      COLLIDERS.some((box) => isInside({ x: (POND.minX + POND.maxX) / 2, z: (POND.minZ + POND.maxZ) / 2 }, box)),
    ).toBe(true);
  });
});

describe("yard size", () => {
  // Owner 2026-11-04: first front x10 / sides x5 (front 210, sides 85),
  // then "halve the area" between the wall and the hall.

  it("the yard between wall and hall is about half its previous area", () => {
    const previous = yardArea(210, 85, 15);
    const now = yardArea(BOUNDARY.maxZ - HALL.maxZ, HALL.minX - BOUNDARY.minX, HALL.minZ - BOUNDARY.minZ);
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

describe('the east gate to the pagoda complex (owner, 2026-11-13: "mở cái cổng sang chùa này cho nhanh")', () => {
  it("lets the avatar walk from the temple yard through both gates into the pagoda plaza", () => {
    const end = walk({ x: BOUNDARY.maxX - 12, z: EAST_GATE.z }, { x: PAGODA_PLAZA.minX + 8, z: EAST_GATE.z });
    expect(end.x).toBeCloseTo(PAGODA_PLAZA.minX + 8, 0);
  });

  it("keeps the rest of the east wall shut", () => {
    const end = walk({ x: BOUNDARY.maxX - 12, z: EAST_GATE.z - 25 }, { x: BOUNDARY.maxX + 12, z: EAST_GATE.z - 25 });
    expect(end.x).toBeLessThan(BOUNDARY.maxX);
  });

  it("does not let the avatar walk through the great stupa, nor over the plaza's far wall", () => {
    const toStupa = walk({ x: PAGODA_PLAZA.minX + 8, z: PAGODA.z }, { x: PAGODA.x, z: PAGODA.z });
    expect(toStupa.x).toBeLessThan(PAGODA.x - 25);
    const toBackWall = walk({ x: PAGODA.x, z: PAGODA_PLAZA.maxZ - 8 }, { x: PAGODA.x, z: PAGODA_PLAZA.maxZ + 30 });
    expect(toBackWall.z).toBeLessThan(PAGODA_PLAZA.maxZ + 6);
  });

  it("puts the feet on the plaza's own level inside the pagoda, and on the ground outside it", () => {
    expect(groundHeightAt({ x: PAGODA.x - 50, z: PAGODA.z })).toBe(PAGODA.groundY);
    expect(groundHeightAt({ x: BOUNDARY.maxX + 10, z: EAST_GATE.z })).toBe(0);
  });
});

describe('the pagoda complex\'s chánh điện (owner, 2026-11-13: "bên trong ko có gì ah? làm tượng phật đi")', () => {
  const centreX = -165; // the hall's middle across (model metres, see scripts/blender/pagoda.py)
  const frontY = -62 - 16; // its front wall
  it("can be entered through its door, up to the altar", () => {
    const end = walk(pagodaToWorld(centreX, frontY - 5), pagodaToWorld(centreX, frontY + 14));
    const goal = pagodaToWorld(centreX, frontY + 14);
    expect(Math.abs(end.x - goal.x)).toBeLessThan(0.3);
    expect(end.z).toBeCloseTo(goal.z, 1);
  });

  it("is closed everywhere but the door, and the altar with its Buddha is solid", () => {
    const intoWall = walk(pagodaToWorld(centreX + 15, frontY - 5), pagodaToWorld(centreX + 15, frontY + 10));
    expect(intoWall.x).toBeLessThan(pagodaToWorld(centreX, frontY).x);
    const toAltar = walk(pagodaToWorld(centreX + 2, frontY + 14), pagodaToWorld(centreX + 2, frontY + 30));
    expect(toAltar.x).toBeLessThan(pagodaToWorld(centreX, frontY + 22).x);
  });

  it("stands on a low platform inside, and on the plain ground outside it", () => {
    expect(isInside(pagodaToWorld(centreX, -62), PAGODA_HALL_FLOOR)).toBe(true);
    expect(groundHeightAt(pagodaToWorld(centreX, -62))).toBeGreaterThan(PAGODA.groundY);
    expect(groundHeightAt(pagodaToWorld(centreX, frontY - 20))).toBe(0);
  });
});
