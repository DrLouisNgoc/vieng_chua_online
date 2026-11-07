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

export function findTargets(position: Point, layout: TargetLayout): Targets {
  let seatIndex: number | null = null;
  let nearest = SEAT_REACH;
  layout.seats.forEach((seat, index) => {
    if (layout.occupied?.has(index)) return;
    const gap = distance(position, seat);
    if (gap <= nearest) {
      nearest = gap;
      seatIndex = index;
    }
  });
  return {
    seatIndex,
    nearBroom: distance(position, layout.broomSpot) <= BROOM_REACH,
    nearBell: layout.bell !== undefined && distance(position, layout.bell) <= BELL_REACH,
    inStatueZone: isInside(position, layout.statueZone),
  };
}

// Heading (atan2(dx, dz) convention, as movement uses) a seated visitor
// faces: hall cushions face the altar, banyan seats face the trunk.
export function seatHeading(seat: Point): number {
  if (isInside(seat, HALL)) return Math.PI;
  return Math.atan2(BANYAN.x - seat.x, BANYAN.z - seat.z);
}
