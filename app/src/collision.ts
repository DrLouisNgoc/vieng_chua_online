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
