import { describe, it, expect } from "vitest";
import { createMovementController } from "./movement";

describe("createMovementController", () => {
  it("starts at the given position, not walking", () => {
    const controller = createMovementController({ start: { x: 0, z: 0 } });
    expect(controller.position).toEqual({ x: 0, z: 0 });
    expect(controller.isWalking).toBe(false);
  });

  it("moveTo() starts walking toward the target", () => {
    const controller = createMovementController({ start: { x: 0, z: 0 } });
    controller.moveTo({ x: 10, z: 0 });
    expect(controller.isWalking).toBe(true);
  });

  it("update() advances position toward the target at the given speed", () => {
    const controller = createMovementController({
      start: { x: 0, z: 0 },
      speedUnitsPerSecond: 2,
    });
    controller.moveTo({ x: 10, z: 0 });
    const pos = controller.update(1);
    expect(pos.x).toBeCloseTo(2);
    expect(pos.z).toBeCloseTo(0);
    expect(controller.isWalking).toBe(true);
  });

  it("update() snaps exactly to the target without overshooting and stops walking", () => {
    const controller = createMovementController({
      start: { x: 0, z: 0 },
      speedUnitsPerSecond: 2,
    });
    controller.moveTo({ x: 1, z: 0 });
    const pos = controller.update(1); // would move 2 units but target is only 1 away
    expect(pos).toEqual({ x: 1, z: 0 });
    expect(controller.isWalking).toBe(false);
  });

  it("update() while not walking leaves position unchanged", () => {
    const controller = createMovementController({ start: { x: 3, z: 4 } });
    const pos = controller.update(1);
    expect(pos).toEqual({ x: 3, z: 4 });
  });

  it("moveTo() during an active walk retargets from the current position", () => {
    const controller = createMovementController({
      start: { x: 0, z: 0 },
      speedUnitsPerSecond: 2,
    });
    controller.moveTo({ x: 10, z: 0 });
    controller.update(1); // now at (2, 0)
    controller.moveTo({ x: 2, z: 4 }); // retarget straight up from here
    const pos = controller.update(1);
    expect(pos.x).toBeCloseTo(2);
    expect(pos.z).toBeCloseTo(2);
  });

  it("facingAngle points toward the direction of travel", () => {
    const controller = createMovementController({ start: { x: 0, z: 0 } });
    controller.moveTo({ x: 1, z: 0 });
    // moving along +x: atan2(dx, dz) = atan2(1, 0) = PI/2
    expect(controller.facingAngle).toBeCloseTo(Math.PI / 2);
  });

  it("applies the constrain option to every step", () => {
    const controller = createMovementController({
      start: { x: 0, z: 0 },
      speedUnitsPerSecond: 2,
      constrain: (_from, to) => ({ x: Math.min(to.x, 1), z: to.z }),
    });
    controller.moveTo({ x: 10, z: 0 });
    expect(controller.update(1)).toEqual({ x: 1, z: 0 });
  });

  it("stop() cancels an in-progress walk in place", () => {
    const controller = createMovementController({
      start: { x: 0, z: 0 },
      speedUnitsPerSecond: 2,
    });
    controller.moveTo({ x: 10, z: 0 });
    controller.update(1); // now at (2, 0), still walking
    controller.stop();
    expect(controller.isWalking).toBe(false);
    const pos = controller.update(1);
    expect(pos).toEqual({ x: 2, z: 0 });
  });

  it("moveTo() to the current position is a no-op (no NaN from a zero-length direction)", () => {
    const controller = createMovementController({ start: { x: 5, z: 5 } });
    controller.moveTo({ x: 5, z: 5 });
    expect(controller.isWalking).toBe(false);
    const pos = controller.update(1);
    expect(pos).toEqual({ x: 5, z: 5 });
  });
});

describe("placeAt", () => {
  it("snaps to the point and stops walking", () => {
    const controller = createMovementController({ start: { x: 0, z: 0 } });
    controller.moveTo({ x: 10, z: 0 });
    controller.placeAt({ x: 3, z: -4 });
    expect(controller.position).toEqual({ x: 3, z: -4 });
    expect(controller.isWalking).toBe(false);
    expect(controller.update(1)).toEqual({ x: 3, z: -4 });
  });
});
