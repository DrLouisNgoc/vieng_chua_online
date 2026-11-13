import type { Point } from "./movement";

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function isInside(point: Point, box: Box): boolean {
  return point.x > box.minX && point.x < box.maxX && point.z > box.minZ && point.z < box.maxZ;
}

function isFree(point: Point, boxes: readonly Box[]): boolean {
  return boxes.every((box) => !isInside(point, box));
}

export function resolveMove(from: Point, to: Point, boxes: readonly Box[]): Point {
  if (isFree(to, boxes)) return to;
  const slideZ = { x: from.x, z: to.z };
  if (isFree(slideZ, boxes)) return slideZ;
  const slideX = { x: to.x, z: from.z };
  return isFree(slideX, boxes) ? slideX : from;
}

// The most the avatar may move in one resolveMove call. Thinner than every wall (the
// thinnest is 0.6 thick), so a slow frame at running speed cannot jump over one.
const MAX_STEP = 0.25;

export function resolveMoveInSteps(from: Point, to: Point, boxes: readonly Box[]): Point {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / MAX_STEP));
  const stepX = (to.x - from.x) / steps;
  const stepZ = (to.z - from.z) / steps;
  let at = from;
  // each step starts from where the avatar really is, so a blocked axis stays blocked
  for (let i = 0; i < steps; i += 1) {
    at = resolveMove(at, { x: at.x + stepX, z: at.z + stepZ }, boxes);
  }
  return at;
}
