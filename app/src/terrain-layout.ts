import type { Box } from "./collision";

// The land a visitor can walk on: a rectangle round the temple and the pagoda
// complex (owner, 2026-11-13: "xây núi xây sông hùng vĩ", "ko để đất trống tí nào").
// Beyond its edge are the foothills, the river and the mountains of terrain.glb
// (scripts/blender/terrain.py, which repeats these numbers as CX, CZ, HX, HZ),
// so the walk ends at this edge. It sits inside WORLD_LIMIT (300) on the east.
export const WALK_AREA: Box = { minX: -160, maxX: 300, minZ: -160, maxZ: 200 };

const BEYOND = 2000;

// Four slabs just outside the rectangle, big enough that nothing can go round them.
export function walkAreaColliders(): Box[] {
  const { minX, maxX, minZ, maxZ } = WALK_AREA;
  return [
    { minX: minX - BEYOND, maxX: minX, minZ: -BEYOND, maxZ: BEYOND },
    { minX: maxX, maxX: maxX + BEYOND, minZ: -BEYOND, maxZ: BEYOND },
    { minX, maxX, minZ: minZ - BEYOND, maxZ: minZ },
    { minX, maxX, minZ: maxZ, maxZ: maxZ + BEYOND },
  ];
}
