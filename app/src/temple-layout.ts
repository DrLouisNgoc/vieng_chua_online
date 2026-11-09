import type { Box } from "./collision";
import { isInside } from "./collision";
import type { Point } from "./movement";

// Plan of the temple grounds (x to the right, -z toward the main hall).
// Pure data: temple-grounds.ts builds the meshes, scene.ts uses the
// colliders and ground heights for the avatar. Sizes are in avatar-relative
// units (the monk is 1.7 tall).

// Stairs up to the raised hall: 9 steps (owner, 2026-11-04).
const STEP_COUNT = 9;
const STEP_RISE = 0.3;
const STEP_TREAD = 0.6;
const PLATFORM_HEIGHT = STEP_COUNT * STEP_RISE;
// Interior height (floor to ceiling) kept from before the hall was raised.
const INTERIOR_HEIGHT = 15.4;

// 76 x 54 floor.
export const HALL = {
  minX: -38,
  maxX: 38,
  minZ: -55,
  maxZ: -1,
  platformHeight: PLATFORM_HEIGHT,
  altar: { minX: -12, maxX: 12, minZ: -54, maxZ: -45 },
  altarHeight: 0.6,
  wallThickness: 0.8,
  sideWallFrontZ: -6,
  roofBaseY: PLATFORM_HEIGHT + INTERIOR_HEIGHT,
  frontPillarZ: -2,
  frontPillarXs: [-34.2, -26.6, -19, -11.4, 11.4, 19, 26.6, 34.2],
  innerPillars: [-10, -20, -30, -40].flatMap((z) =>
    [-28, -15, 15, 28].map((x) => ({ x, z })),
  ),
} as const;

// Steps run from the hall's front edge (frontZ) outward to +z; the step
// nearest the hall is level with the platform.
export const STAIRS = {
  minX: -5,
  maxX: 5,
  frontZ: HALL.maxZ,
  count: STEP_COUNT,
  rise: STEP_RISE,
  tread: STEP_TREAD,
  balustradeWidth: 0.6,
} as const;
const STAIRS_FOOT_Z = STAIRS.frontZ + STAIRS.count * STAIRS.tread;

// The Shakyamuni Buddha is the large central figure on its own lotus
// pedestal, reaching almost to the ceiling; the two bodhisattvas flank it
// lower and smaller.
export const STATUES = {
  buddha: { x: 0, z: -49.5, height: 12, pedestal: 1 },
  avalokitesvara: { x: -8.5, z: -49, height: 6, pedestal: 0 },
  mahastamaprapta: { x: 8.5, z: -49, height: 6, pedestal: 0 },
} as const;

export const AVATAR_START: Point = { x: 0, z: STAIRS_FOOT_Z + 2 };

// Yard between the hall and the perimeter wall. Owner, 2026-11-04: first
// front x10 (210) and sides x5 (85); then "halve the area": both gaps shrunk
// by the same factor (~0.62) so the yard area is half (see status.md
// ruling). The back yard was never mentioned and stays at 15.
const FRONT_YARD = 130;
const SIDE_YARD = 53;
const BACK_YARD = 15;

// Perimeter wall; the three-entrance gate (tam quan) sits in its front side.
export const BOUNDARY = {
  minX: HALL.minX - SIDE_YARD,
  maxX: HALL.maxX + SIDE_YARD,
  minZ: HALL.minZ - BACK_YARD,
  maxZ: HALL.maxZ + FRONT_YARD,
  thickness: 0.6,
  height: 2.6,
} as const;

// The whole yard inside the wall is brick-paved; its top sits this high.
export const PAVING_HEIGHT = 0.04;

export const GATE = {
  z: BOUNDARY.maxZ,
  pillarXs: [-6, -2.2, 2.2, 6],
  centralHeight: 5.2,
  sideHeight: 4,
} as const;

// Forecourt at the foot of the stairs (paved like the rest of the yard).
export const COURTYARD = { minX: -9.5, maxX: 9.5, minZ: 0, maxZ: 16 } as const;

// Stone path from just outside the gate to the forecourt.
export const PATH = { fromZ: GATE.z + 4, toZ: COURTYARD.maxZ, width: 1.6 } as const;

// Bronze incense urn on the hall's axis.
export const URN = { x: 0, z: 13.5, radius: 0.9 } as const;

export const BELL_TOWER = { x: 30, z: 30, half: 2.6, platformHeight: 0.4, pillarOffset: 1.9 } as const;
// Close enough to the bell tower to ring the bell (Milestone 7).
export const BELL_REACH = BELL_TOWER.half + 1.5;

// Pairs of stone pillars lining the path.
export const STONE_PILLARS: Point[] = [7.5, 11, 40, 80, 115].flatMap((z) => [
  { x: -2.2, z },
  { x: 2.2, z },
]);

// Milestone 7: stone lantern posts beside the path, clear of the pillar
// pairs (z 40/80/115) and the tree avenue (x ±10).
export const LANTERN_POSTS: Point[] = [20, 30, 50, 60, 70, 90, 100, 108].flatMap((z) => [
  { x: -3.2, z },
  { x: 3.2, z },
]);
export const LANTERN_POST_HEIGHT = 1.6;

// A paper lantern hung on the yard side of each front pillar of the hall.
export const HALL_LANTERNS = HALL.frontPillarXs.map((x) => ({
  x,
  z: HALL.frontPillarZ + 0.9,
  y: HALL.platformHeight + 4.2,
}));

// The only real lights (the rest glow by emissive): two either side of the
// top of the stairs (lighting the start point), two at the first path posts.
export const LANTERN_LIGHTS = [
  { x: -5.5, y: HALL.platformHeight + 3, z: HALL.frontPillarZ + 2.5 },
  { x: 5.5, y: HALL.platformHeight + 3, z: HALL.frontPillarZ + 2.5 },
  { x: -3.2, y: 1.8, z: 20 },
  { x: 3.2, y: 1.8, z: 20 },
];

export const HUT = { x: -40, z: 60, size: 3.2 } as const;

// 8 cốc near the existing meditation hut (owner, 2026-11-09), in a single
// row along z ("hàng dọc", owner 2026-11-09) beside it (HUT, untouched):
// the 4 named ones (fixed occupant, content password set by the owner)
// first, then the 4 open for registration ("Thuyết Pháp"), approved by
// the owner. ids must match server/src/boards.ts BOARD_SEEDS exactly.
const COC_SIZE = 2.4;
const COC_STEP = 8;
const COC_ROW_X = HUT.x - 10;
const COC_ROW_Z0 = HUT.z - 3.5 * COC_STEP;
export interface CocSpot extends Point {
  id: string;
  title: string;
  size: number;
}
export const COC_SPOTS: CocSpot[] = (
  [
    ["coc-co-chi-yen", "Cốc Cô Yến"],
    ["coc-anh-tuan-ha", "Cốc Anh Tuấn Hà"],
    ["coc-su-phu", "Cốc Sư Nguyên Tuệ"],
    ["coc-cua-toi", "Cốc Khánh"],
    ["coc-mo-1", "Cốc Thuyết Pháp 1"],
    ["coc-mo-2", "Cốc Thuyết Pháp 2"],
    ["coc-mo-3", "Cốc Thuyết Pháp 3"],
    ["coc-mo-4", "Cốc Thuyết Pháp 4"],
  ] as const
).map(([id, title], index) => ({
  id,
  title,
  size: COC_SIZE,
  x: COC_ROW_X,
  z: COC_ROW_Z0 + index * COC_STEP,
}));

// Reach to open a cốc's board, or the hall projector, same radius.
export const BOARD_REACH = 1.8;

// Photo of Thầy Nguyên Tuệ + the projector that plays his talks, inside
// the hall, clear of the seat rows (|x| <= 12.6) and the inner pillars.
export const HALL_PROJECTOR: Point = { x: 28, z: -6 };

// Rectangular lotus pond alongside the hall's right-hand side.
export const POND = { minX: 48, maxX: 74, minZ: -44, maxZ: -10 } as const;

export const BANYAN = { x: -48, z: -10, seatRadius: 2.8 } as const;

// Small pines are planted outside the wall, in rows around it.
const PINE_SPACING = 30;
const PINE_OFFSET = 12;
export const PINE_POSITIONS: Point[] = [
  ...Array.from(
    { length: Math.floor((BOUNDARY.maxZ - BOUNDARY.minZ) / PINE_SPACING) + 1 },
    (_, i) => BOUNDARY.minZ + i * PINE_SPACING,
  ).flatMap((z) => [
    { x: BOUNDARY.minX - PINE_OFFSET, z },
    { x: BOUNDARY.maxX + PINE_OFFSET, z },
  ]),
  ...Array.from(
    { length: Math.floor((BOUNDARY.maxX - BOUNDARY.minX) / PINE_SPACING) + 1 },
    (_, i) => BOUNDARY.minX + i * PINE_SPACING,
  ).flatMap((x) => [
    { x, z: BOUNDARY.minZ - PINE_OFFSET },
    // leave the approach to the gate open
    ...(Math.abs(x) > 15 ? [{ x, z: BOUNDARY.maxZ + PINE_OFFSET }] : []),
  ]),
];

// Round-canopy broadleaf trees: an avenue along the path, others scattered.
export const BROADLEAF_TREES: Point[] = [
  ...[30, 55, 80, 105].flatMap((z) => [
    { x: -10, z },
    { x: 10, z },
  ]),
  { x: -70, z: 20 },
  { x: 70, z: 25 },
  { x: -75, z: 90 },
  { x: 75, z: 95 },
  { x: -60, z: 118 },
  { x: 62, z: 118 },
  { x: -80, z: -25 },
  { x: 84, z: 0 },
  { x: -75, z: -55 },
  { x: 80, z: -58 },
];

// Bamboo groves along the wall.
const BAMBOO_INSET = 4;
export const BAMBOO_CLUMPS: Point[] = [
  ...[-60, 0, 60, 120].flatMap((z) => [
    { x: BOUNDARY.minX + BAMBOO_INSET, z },
    { x: BOUNDARY.maxX - BAMBOO_INSET, z },
  ]),
  { x: -60, z: BOUNDARY.minZ + BAMBOO_INSET },
  { x: 60, z: BOUNDARY.minZ + BAMBOO_INSET },
  ...[-70, -30, 30, 70].map((x) => ({ x, z: BOUNDARY.maxZ - BAMBOO_INSET })),
];

// Rows of cushions facing the altar, with a walkway down the middle.
const SEAT_SPACING = 1.5;
const HALL_SEAT_XS = Array.from({ length: 8 }, (_, i) => 2.1 + i * SEAT_SPACING)
  .flatMap((x) => [-x, x]);
const HALL_SEAT_ZS = Array.from({ length: 24 }, (_, i) => -5 - i * 1.6);

export const MEDITATION_SEATS: Point[] = [
  ...HALL_SEAT_ZS.flatMap((z) => HALL_SEAT_XS.map((x) => ({ x, z }))),
  { x: BANYAN.x + BANYAN.seatRadius, z: BANYAN.z },
  { x: BANYAN.x - BANYAN.seatRadius, z: BANYAN.z },
  { x: BANYAN.x, z: BANYAN.z + BANYAN.seatRadius },
  { x: BANYAN.x, z: BANYAN.z - BANYAN.seatRadius },
];

// Milestone 5 interactions (values: design.md rulings).
export const SEAT_REACH = 1.2;
export const BROOM_REACH = 1.5;
// Beside the stone path, just before the tree avenue.
export const BROOM_SPOT: Point = { x: -7, z: 24 };
// Strip of hall floor between the altar front and the nearest cushion row.
export const STATUE_ZONE: Box = { minX: -12, maxX: 12, minZ: -45, maxZ: -41.5 };
// Leaves fall under these trees: the avenue along the path and the banyan.
export const LEAF_SOURCES: Point[] = [
  ...BROADLEAF_TREES.filter((tree) => Math.abs(tree.x) === 10),
  { x: BANYAN.x, z: BANYAN.z },
];

export const WORLD_LIMIT = 300;

function around(center: Point, half: number): Box {
  return {
    minX: center.x - half,
    maxX: center.x + half,
    minZ: center.z - half,
    maxZ: center.z + half,
  };
}

const t = HALL.wallThickness;
const EDGE = 0.4; // thickness of the invisible platform-edge colliders

const GATE_OUTER_X = Math.max(...GATE.pillarXs) + 0.5;

// Wall runs as [x0, z0, x1, z1] centre lines; the front side leaves the
// gate's span open.
export const WALL_SEGMENTS: [number, number, number, number][] = [
  [BOUNDARY.minX, BOUNDARY.minZ, BOUNDARY.maxX, BOUNDARY.minZ],
  [BOUNDARY.minX, BOUNDARY.minZ, BOUNDARY.minX, BOUNDARY.maxZ],
  [BOUNDARY.maxX, BOUNDARY.minZ, BOUNDARY.maxX, BOUNDARY.maxZ],
  [BOUNDARY.minX, BOUNDARY.maxZ, -GATE_OUTER_X, BOUNDARY.maxZ],
  [GATE_OUTER_X, BOUNDARY.maxZ, BOUNDARY.maxX, BOUNDARY.maxZ],
];

function wallColliders(): Box[] {
  const half = BOUNDARY.thickness / 2;
  return WALL_SEGMENTS.map(([x0, z0, x1, z1]) => ({
    minX: Math.min(x0, x1) - half,
    maxX: Math.max(x0, x1) + half,
    minZ: Math.min(z0, z1) - half,
    maxZ: Math.max(z0, z1) + half,
  }));
}

export const COLLIDERS: Box[] = [
  // hall back wall and two partial side walls
  { minX: HALL.minX, maxX: HALL.maxX, minZ: HALL.minZ, maxZ: HALL.minZ + t },
  { minX: HALL.minX, maxX: HALL.minX + t, minZ: HALL.minZ, maxZ: HALL.sideWallFrontZ },
  { minX: HALL.maxX - t, maxX: HALL.maxX, minZ: HALL.minZ, maxZ: HALL.sideWallFrontZ },
  // the raised platform's open edges: the hall is entered only by the stairs
  { minX: HALL.minX, maxX: HALL.minX + EDGE, minZ: HALL.minZ, maxZ: HALL.maxZ },
  { minX: HALL.maxX - EDGE, maxX: HALL.maxX, minZ: HALL.minZ, maxZ: HALL.maxZ },
  { minX: HALL.minX, maxX: STAIRS.minX, minZ: HALL.maxZ - EDGE, maxZ: HALL.maxZ },
  { minX: STAIRS.maxX, maxX: HALL.maxX, minZ: HALL.maxZ - EDGE, maxZ: HALL.maxZ },
  // stair balustrades
  {
    minX: STAIRS.minX - STAIRS.balustradeWidth,
    maxX: STAIRS.minX,
    minZ: STAIRS.frontZ,
    maxZ: STAIRS_FOOT_Z,
  },
  {
    minX: STAIRS.maxX,
    maxX: STAIRS.maxX + STAIRS.balustradeWidth,
    minZ: STAIRS.frontZ,
    maxZ: STAIRS_FOOT_Z,
  },
  // altar with the three statues
  HALL.altar,
  ...HALL.frontPillarXs.map((x) => around({ x, z: HALL.frontPillarZ }, 0.7)),
  ...HALL.innerPillars.map((p) => around(p, 0.7)),
  ...STONE_PILLARS.map((p) => around(p, 0.35)),
  ...LANTERN_POSTS.map((p) => around(p, 0.3)),
  around(HUT, HUT.size / 2),
  ...COC_SPOTS.map((spot) => around(spot, spot.size / 2)),
  around(HALL_PROJECTOR, 0.6),
  POND,
  around(BANYAN, 1.4),
  ...PINE_POSITIONS.map((p) => around(p, 0.4)),
  ...BROADLEAF_TREES.map((p) => around(p, 0.6)),
  ...BAMBOO_CLUMPS.map((p) => around(p, 1.3)),
  around(URN, URN.radius),
  ...GATE.pillarXs.map((x) => around({ x, z: GATE.z }, 0.5)),
  ...[-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) =>
      around(
        {
          x: BELL_TOWER.x + sx * BELL_TOWER.pillarOffset,
          z: BELL_TOWER.z + sz * BELL_TOWER.pillarOffset,
        },
        0.35,
      ),
    ),
  ),
  // perimeter wall, front side split around the gate
  ...wallColliders(),
  // world edge
  { minX: -WORLD_LIMIT - 1, maxX: -WORLD_LIMIT, minZ: -WORLD_LIMIT, maxZ: WORLD_LIMIT },
  { minX: WORLD_LIMIT, maxX: WORLD_LIMIT + 1, minZ: -WORLD_LIMIT, maxZ: WORLD_LIMIT },
  { minX: -WORLD_LIMIT, maxX: WORLD_LIMIT, minZ: -WORLD_LIMIT - 1, maxZ: -WORLD_LIMIT },
  { minX: -WORLD_LIMIT, maxX: WORLD_LIMIT, minZ: WORLD_LIMIT, maxZ: WORLD_LIMIT + 1 },
];

function stairHeightAt(point: Point): number | null {
  if (point.x <= STAIRS.minX || point.x >= STAIRS.maxX) return null;
  if (point.z < STAIRS.frontZ || point.z >= STAIRS_FOOT_Z) return null;
  const fromTop = Math.floor((point.z - STAIRS.frontZ) / STAIRS.tread);
  return (STAIRS.count - fromTop) * STAIRS.rise;
}

export function groundHeightAt(point: Point): number {
  if (isInside(point, HALL)) return HALL.platformHeight;
  const stair = stairHeightAt(point);
  if (stair !== null) return stair;
  if (isInside(point, around(BELL_TOWER, BELL_TOWER.half))) {
    return BELL_TOWER.platformHeight;
  }
  if (isInside(point, BOUNDARY)) return PAVING_HEIGHT;
  return 0;
}
