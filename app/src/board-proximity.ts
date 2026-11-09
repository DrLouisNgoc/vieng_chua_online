import { BOARD_REACH, COC_SPOTS, HALL_PROJECTOR } from "./temple-layout";

export interface BoardSpot {
  id: string;
  x: number;
  z: number;
}

const BOARD_SPOTS: BoardSpot[] = [
  ...COC_SPOTS.map(({ id, x, z }) => ({ id, x, z })),
  { id: "may-chieu-chanh-dien", x: HALL_PROJECTOR.x, z: HALL_PROJECTOR.z },
];

// The id of the cốc or hall projector within BOARD_REACH of `position`, or
// null. Pure, so main.ts can call it every frame without touching the DOM.
export function nearestBoardId(position: { x: number; z: number }): string | null {
  for (const spot of BOARD_SPOTS) {
    if (Math.hypot(position.x - spot.x, position.z - spot.z) <= BOARD_REACH) return spot.id;
  }
  return null;
}
