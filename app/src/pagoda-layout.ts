import type { Box } from "./collision";

// The Shwedagon-style gold pagoda complex east of the temple (owner,
// 2026-11-13: a Shwedagon photo, "làm hoành tráng vào"), and where its solid
// parts stand. The model is scripts/blender/pagoda.py's: the marble plaza is
// 210 m across, so its half-size is 105 model metres. Visitors walk in through
// the east gate of the temple wall; the numbers marked "model" below are the
// script's, in model metres, and must change together with it.
const PAGODA_SCALE = 0.7;
export const PAGODA = {
  x: 190,
  z: 30,
  scale: PAGODA_SCALE,
  halfSize: 105 * PAGODA_SCALE,
  // The model's front faces +z; turned to face west, toward the temple.
  rotationY: -Math.PI / 2,
  // Just above the ground plane so the plaza does not flicker against it.
  groundY: 0.1,
} as const;

// The marble plaza, where the feet are at PAGODA.groundY.
export const PAGODA_PLAZA: Box = {
  minX: PAGODA.x - PAGODA.halfSize,
  maxX: PAGODA.x + PAGODA.halfSize,
  minZ: PAGODA.z - PAGODA.halfSize,
  maxZ: PAGODA.z + PAGODA.halfSize,
};

// Model (bx, by) → world: the model's front (by = -110) faces west.
export function pagodaToWorld(bx: number, by: number): { x: number; z: number } {
  return { x: PAGODA.x + by * PAGODA_SCALE, z: PAGODA.z + bx * PAGODA_SCALE };
}

function boxAround(bx: number, by: number, halfX: number, halfY: number): Box {
  const centre = pagodaToWorld(bx, by);
  const halfWorldX = halfY * PAGODA_SCALE; // model y runs along world x
  const halfWorldZ = halfX * PAGODA_SCALE;
  return {
    minX: centre.x - halfWorldX,
    maxX: centre.x + halfWorldX,
    minZ: centre.z - halfWorldZ,
    maxZ: centre.z + halfWorldZ,
  };
}

const WALL_HALF = 110; // model: the wall round the plaza
const WALL_THICK = 1.4;
const GATE_HALF = 9; // model: the gap in its front side, between the gate's pillars
const TERRACE_HALF = 46; // model: the stupa's lowest terrace
const TOWER_AT = 70;
const TOWER_HALF = 5.2;
const SHRINE_ROW_AT = 92;
const SHRINE_ROW_STEP = 24;
const SHRINE_HALF = 2.7;

// The hall beside the complex (model metres, as built by main_hall() in
// pagoda.py): hollow, with a door of half-width DOOR in its front (-by) wall,
// columns inside and an altar with the Buddha at the back.
const HALL = {
  bx: -165,
  by: -62,
  halfX: 28,
  halfY: 16,
  wall: 1.4,
  door: 4,
  platformRim: 3,
  platformHeight: 0.8,
} as const;
const HALL_COLUMN_XS = [-16, -8, 8, 16];
const HALL_COLUMN_YS = [-6, 2];
const HALL_ALTAR = { halfX: 9, halfY: 4.5 } as const; // centred 4.5 + wall from the back wall

// The platform the hall stands on: its rim is where the feet rise to the hall's floor.
export const PAGODA_HALL_FLOOR: Box = boxAround(
  HALL.bx,
  HALL.by,
  HALL.halfX + HALL.platformRim,
  HALL.halfY + HALL.platformRim,
);
export const PAGODA_HALL_FLOOR_HEIGHT = PAGODA.groundY + HALL.platformHeight * PAGODA_SCALE;

// Lamps inside the hall, as [bx, by] with the height in HALL_LAMP_HEIGHT (model metres).
export const PAGODA_HALL_LAMPS: readonly (readonly [number, number])[] = [
  [HALL.bx - 14, HALL.by - 2],
  [HALL.bx + 14, HALL.by - 2],
  [HALL.bx, HALL.by + 8],
];
export const HALL_LAMP_HEIGHT = 7;

// The temple's own Buddha statue, copied onto the altar (owner: "tạo tượng đẹp như
// tôi tạo vào"): the altar's top is 1.3 model metres above the floor, and the statue
// faces the door. buddha.glb faces +x as it comes, so the door at -x needs a half turn.
const HALL_ALTAR_TOP = HALL.platformHeight + 1.3;
const buddhaSpot = pagodaToWorld(HALL.bx, HALL.by + HALL.halfY - HALL.wall - 4.2);
export const PAGODA_HALL_BUDDHA = {
  x: buddhaSpot.x,
  z: buddhaSpot.z,
  baseY: PAGODA.groundY + HALL_ALTAR_TOP * PAGODA_SCALE,
  height: 4.8,
  rotationY: Math.PI,
} as const;

// Where the visitor worships (owner, 2026-11-13: "nơi để thắp hương, cầu nguyện, quỳ lạy"): the
// strip of floor in front of the altar, which the altar's collider makes the end of the walk, with
// an incense urn in the middle of it (solid) and kneeling cushions (flat, walkable) round it.
const ALTAR_FRONT_Y = HALL.by + HALL.halfY - HALL.wall - 2 * HALL_ALTAR.halfY;
const zoneBack = pagodaToWorld(HALL.bx - 13, ALTAR_FRONT_Y - 4.6);
const zoneFront = pagodaToWorld(HALL.bx + 13, ALTAR_FRONT_Y + 0.4);
export const PAGODA_HALL_STATUE_ZONE: Box = {
  minX: Math.min(zoneBack.x, zoneFront.x),
  maxX: Math.max(zoneBack.x, zoneFront.x),
  minZ: Math.min(zoneBack.z, zoneFront.z),
  maxZ: Math.max(zoneBack.z, zoneFront.z),
};
export const PAGODA_HALL_URN = pagodaToWorld(HALL.bx, ALTAR_FRONT_Y - 2.2);

function hallColliders(): Box[] {
  const { bx, by, halfX, halfY, wall, door } = HALL;
  const side = (halfX - door) / 2;
  return [
    boxAround(bx, by + halfY - wall / 2, halfX, wall / 2), // back wall
    boxAround(bx - halfX + wall / 2, by, wall / 2, halfY), // side walls
    boxAround(bx + halfX - wall / 2, by, wall / 2, halfY),
    boxAround(bx - door - side, by - halfY + wall / 2, side, wall / 2), // front, either side of the door
    boxAround(bx + door + side, by - halfY + wall / 2, side, wall / 2),
    ...HALL_COLUMN_XS.flatMap((x) => HALL_COLUMN_YS.map((y) => boxAround(bx + x, by + y, 0.7, 0.7))),
    boxAround(bx, by + halfY - wall - HALL_ALTAR.halfY, HALL_ALTAR.halfX, HALL_ALTAR.halfY), // altar and Buddha
    boxAround(bx, ALTAR_FRONT_Y - 2.2, 1.3, 1.3), // the incense urn
  ];
}

export function pagodaColliders(): Box[] {
  const wall = (bx: number, by: number, halfX: number, halfY: number): Box => boxAround(bx, by, halfX, halfY);
  const gateEdge = (WALL_HALF + GATE_HALF) / 2;
  const gateSpan = (WALL_HALF - GATE_HALF) / 2;
  const shrineSpots = [-3, -2, -1, 1, 2, 3].map((i) => i * SHRINE_ROW_STEP);
  return [
    // the wall: the front has the gate's gap, the other three sides are whole
    wall(-gateEdge, -WALL_HALF, gateSpan, WALL_THICK / 2),
    wall(gateEdge, -WALL_HALF, gateSpan, WALL_THICK / 2),
    wall(0, WALL_HALF, WALL_HALF, WALL_THICK / 2),
    wall(-WALL_HALF, 0, WALL_THICK / 2, WALL_HALF),
    wall(WALL_HALF, 0, WALL_THICK / 2, WALL_HALF),
    // the gate's two pillars
    wall(-GATE_HALF, -WALL_HALF, 1.4, 1.4),
    wall(GATE_HALF, -WALL_HALF, 1.4, 1.4),
    // the stupa on its terraces, with the ring of small stupas and shrines on them
    wall(0, 0, TERRACE_HALF, TERRACE_HALF),
    // the four corner towers
    ...[-TOWER_AT, TOWER_AT].flatMap((bx) => [-TOWER_AT, TOWER_AT].map((by) => wall(bx, by, TOWER_HALF, TOWER_HALF))),
    // the shrines along the four edges
    ...shrineSpots.flatMap((at) => [
      wall(at, -SHRINE_ROW_AT, SHRINE_HALF, SHRINE_HALF),
      wall(at, SHRINE_ROW_AT, SHRINE_HALF, SHRINE_HALF),
      wall(-SHRINE_ROW_AT, at, SHRINE_HALF, SHRINE_HALF),
      wall(SHRINE_ROW_AT, at, SHRINE_HALF, SHRINE_HALF),
    ]),
    ...hallColliders(),
  ];
}
