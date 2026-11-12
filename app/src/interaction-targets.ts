import type { Box } from "./collision";
import { isInside } from "./collision";
import type { Point } from "./movement";
import { BANYAN, BELL_REACH, BROOM_REACH, HALL, SEAT_REACH } from "./temple-layout";

export interface TargetLayout {
  seats: readonly Point[];
  broomSpot: Point;
  statueZone: Box;
  bell?: Point;
  // Seats taken by other visitors (Milestone 6).
  occupied?: ReadonlySet<number>;
}

export interface Targets {
  seatIndex: number | null;
  nearBroom: boolean;
  nearBell: boolean;
  inStatueZone: boolean;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// The closest free seat within reach; on a tie, the later seat wins.
function nearestFreeSeat(position: Point, layout: TargetLayout): number | null {
  let best: { index: number | null; gap: number } = { index: null, gap: SEAT_REACH };
  for (const [index, seat] of layout.seats.entries()) {
    const gap = distance(position, seat);
    const isCloser = layout.occupied?.has(index) !== true && gap <= best.gap;
    best = isCloser ? { index, gap } : best;
  }
  return best.index;
}

export function findTargets(position: Point, layout: TargetLayout): Targets {
  return {
    seatIndex: nearestFreeSeat(position, layout),
    nearBroom: distance(position, layout.broomSpot) <= BROOM_REACH,
    nearBell: layout.bell !== undefined && distance(position, layout.bell) <= BELL_REACH,
    inStatueZone: isInside(position, layout.statueZone),
  };
}

// Heading (atan2(dx, dz) convention, as movement uses) a seated visitor
// faces: hall cushions face the altar, banyan seats face the trunk.
export function seatHeading(seat: Point): number {
  return isInside(seat, HALL) ? Math.PI : Math.atan2(BANYAN.x - seat.x, BANYAN.z - seat.z);
}
