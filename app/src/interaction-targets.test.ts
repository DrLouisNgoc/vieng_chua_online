import { describe, it, expect } from "vitest";
import { findTargets, seatHeading } from "./interaction-targets";
import {
  BANYAN,
  BROOM_SPOT,
  MEDITATION_SEATS,
  SEAT_REACH,
  BROOM_REACH,
  STATUE_ZONE,
} from "./temple-layout";

const seats = [
  { x: 0, z: 0 },
  { x: 1, z: 0 },
  { x: 5, z: 5 },
];
const layout = { seats, broomSpot: { x: 20, z: 20 }, statueZone: STATUE_ZONE };

describe("findTargets", () => {
  it("picks the nearest free seat in reach", () => {
    expect(findTargets({ x: 0.7, z: 0 }, layout).seatIndex).toBe(1);
    expect(findTargets({ x: 0.2, z: 0.1 }, layout).seatIndex).toBe(0);
  });

  it("skips occupied seats", () => {
    const targets = findTargets({ x: 0.7, z: 0 }, { ...layout, occupied: new Set([1]) });
    expect(targets.seatIndex).toBe(0);
  });

  it("offers no seat out of reach", () => {
    expect(findTargets({ x: 5, z: 5 + SEAT_REACH + 0.01 }, layout).seatIndex).toBeNull();
  });

  it("knows when the broom spot is in reach", () => {
    expect(findTargets({ x: 20, z: 20 + BROOM_REACH - 0.01 }, layout).nearBroom).toBe(true);
    expect(findTargets({ x: 20, z: 20 + BROOM_REACH + 0.01 }, layout).nearBroom).toBe(false);
  });

  it("knows when the avatar is in the statue zone", () => {
    const inside = { x: 0, z: (STATUE_ZONE.minZ + STATUE_ZONE.maxZ) / 2 };
    expect(findTargets(inside, layout).inStatueZone).toBe(true);
    expect(findTargets({ x: 0, z: STATUE_ZONE.maxZ + 0.5 }, layout).inStatueZone).toBe(false);
    expect(findTargets({ x: STATUE_ZONE.maxX + 0.5, z: inside.z }, layout).inStatueZone).toBe(false);
  });

  it("works on the real layout: a hall cushion and the broom", () => {
    const first = MEDITATION_SEATS[0];
    expect(findTargets(first, { seats: MEDITATION_SEATS, broomSpot: BROOM_SPOT, statueZone: STATUE_ZONE }).seatIndex).toBe(0);
    expect(
      findTargets(BROOM_SPOT, { seats: MEDITATION_SEATS, broomSpot: BROOM_SPOT, statueZone: STATUE_ZONE }).nearBroom,
    ).toBe(true);
  });
});

describe("seatHeading", () => {
  it("faces the altar (-z) on hall cushions", () => {
    expect(Math.cos(seatHeading(MEDITATION_SEATS[0]))).toBeCloseTo(-1);
  });

  it("faces the banyan trunk on its seats", () => {
    const east = { x: BANYAN.x + BANYAN.seatRadius, z: BANYAN.z };
    const heading = seatHeading(east);
    // looking toward -x: sin(heading) = -1
    expect(Math.sin(heading)).toBeCloseTo(-1);
  });
});
