import type { Box } from "./collision";
import { isInside } from "./collision";
import type { Point } from "./movement";

// Plan of the temple grounds (x to the right, -z toward the main hall).
// Pure data: temple-grounds.ts builds the meshes, scene.ts uses the
// colliders and ground heights for the avatar. Sizes are in avatar-relative
// units (the monk is 1.7 tall).

export const AVATAR_START: Point = { x: 0, z: 2.5 };

// 76 x 54 floor: ten times the area of the previous 24 x 17 hall.
export const HALL = {
  minX: -38,
  maxX: 38,
  minZ: -55,
  maxZ: -1,
  platformHeight: 0.6,
  step: { minX: -4, maxX: 4, minZ: -1, maxZ: 0 },
  stepHeight: 0.3,
  altar: { minX: -12, maxX: 12, minZ: -54, maxZ: -45 },
  altarHeight: 0.6,
  wallThickness: 0.8,
  sideWallFrontZ: -6,
  roofBaseY: 16,
  frontPillarZ: -2,
  frontPillarXs: [-34.2, -26.6, -19, -11.4, 11.4, 19, 26.6, 34.2],
  innerPillars: [-10, -20, -30, -40].flatMap((z) =>
    [-28, -15, 15, 28].map((x) => ({ x, z })),
  ),
} as const;

// The Shakyamuni Buddha is the large central figure on its own lotus
// pedestal, reaching almost to the ceiling; the two bodhisattvas flank it
// lower and smaller.
export const STATUES = {
  buddha: { x: 0, z: -49.5, height: 12, pedestal: 1 },
  avalokitesvara: { x: -8.5, z: -49, height: 6, pedestal: 0 },
  mahastamaprapta: { x: 8.5, z: -49, height: 6, pedestal: 0 },
} as const;

export const PATH = { fromZ: 13, toZ: 0.2, width: 1.6 } as const;

export const STONE_PILLARS: Point[] = [
  { x: -2.2, z: 3.5 },
  { x: 2.2, z: 3.5 },
  { x: -2.2, z: 7.5 },
  { x: 2.2, z: 7.5 },
];

export const HUT = { x: -13, z: 6, size: 3.2 } as const;
export const POND = { x: 13, z: 6, radius: 3 } as const;
export const BANYAN = { x: -48, z: -10, seatRadius: 2.8 } as const;

export const PINE_POSITIONS: Point[] = [
  { x: -25, z: 3 },
  { x: -19, z: 10 },
  { x: 20, z: 2 },
  { x: 19, z: 13 },
  { x: 6, z: 15 },
  { x: -7, z: 15 },
  { x: -45, z: 5 },
  { x: -50, z: -28 },
  { x: -46, z: -46 },
  { x: 45, z: -30 },
  { x: 48, z: -8 },
  { x: 44, z: -50 },
  { x: 0, z: -63 },
  { x: -20, z: -63 },
  { x: 22, z: -62 },
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

export const WORLD_LIMIT = 90;

function around(center: Point, half: number): Box {
  return {
    minX: center.x - half,
    maxX: center.x + half,
    minZ: center.z - half,
    maxZ: center.z + half,
  };
}

const t = HALL.wallThickness;

export const COLLIDERS: Box[] = [
  // hall back wall and two partial side walls
  { minX: HALL.minX, maxX: HALL.maxX, minZ: HALL.minZ, maxZ: HALL.minZ + t },
  { minX: HALL.minX, maxX: HALL.minX + t, minZ: HALL.minZ, maxZ: HALL.sideWallFrontZ },
  { minX: HALL.maxX - t, maxX: HALL.maxX, minZ: HALL.minZ, maxZ: HALL.sideWallFrontZ },
  // altar with the three statues
  HALL.altar,
  ...HALL.frontPillarXs.map((x) => around({ x, z: HALL.frontPillarZ }, 0.7)),
  ...HALL.innerPillars.map((p) => around(p, 0.7)),
  ...STONE_PILLARS.map((p) => around(p, 0.35)),
  around(HUT, HUT.size / 2),
  around(POND, POND.radius),
  around(BANYAN, 1.4),
  ...PINE_POSITIONS.map((p) => around(p, 0.4)),
  // world edge
  { minX: -WORLD_LIMIT - 1, maxX: -WORLD_LIMIT, minZ: -WORLD_LIMIT, maxZ: WORLD_LIMIT },
  { minX: WORLD_LIMIT, maxX: WORLD_LIMIT + 1, minZ: -WORLD_LIMIT, maxZ: WORLD_LIMIT },
  { minX: -WORLD_LIMIT, maxX: WORLD_LIMIT, minZ: -WORLD_LIMIT - 1, maxZ: -WORLD_LIMIT },
  { minX: -WORLD_LIMIT, maxX: WORLD_LIMIT, minZ: WORLD_LIMIT, maxZ: WORLD_LIMIT + 1 },
];

export function groundHeightAt(point: Point): number {
  if (isInside(point, HALL)) return HALL.platformHeight;
  if (isInside(point, HALL.step)) return HALL.stepHeight;
  return 0;
}
