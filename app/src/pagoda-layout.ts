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
function toWorld(bx: number, by: number): { x: number; z: number } {
  return { x: PAGODA.x + by * PAGODA_SCALE, z: PAGODA.z + bx * PAGODA_SCALE };
}

function boxAround(bx: number, by: number, halfX: number, halfY: number): Box {
  const centre = toWorld(bx, by);
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

// The hall beside the complex: its centre and half-size (model), platform included.
const HALL = { bx: -165, by: -62, halfX: 31, halfY: 19 } as const;

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
    wall(HALL.bx, HALL.by, HALL.halfX, HALL.halfY),
  ];
}
