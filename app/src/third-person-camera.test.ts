import { describe, it, expect } from "vitest";
import {
  DEFAULT_RIG,
  applyDrag,
  applyZoom,
  desiredCameraPosition,
  moveDirection,
  normalizeAngle,
  turnTowards,
} from "./third-person-camera";

const target = { x: 0, y: 1, z: 0 };

describe("desiredCameraPosition", () => {
  it("sits behind an avatar facing -z (heading PI)", () => {
    const cam = desiredCameraPosition(target, Math.PI, DEFAULT_RIG);
    expect(cam.z).toBeGreaterThan(target.z);
    expect(cam.x).toBeCloseTo(target.x);
  });

  it("sits behind an avatar facing +x (heading PI/2)", () => {
    const cam = desiredCameraPosition(target, Math.PI / 2, DEFAULT_RIG);
    expect(cam.x).toBeLessThan(target.x);
    expect(cam.z).toBeCloseTo(target.z);
  });

  it("is raised above the target by the pitch", () => {
    const cam = desiredCameraPosition(target, 0, { ...DEFAULT_RIG, pitch: 0.5 });
    expect(cam.y).toBeGreaterThan(target.y);
  });

  it("keeps the configured distance from the target", () => {
    const cam = desiredCameraPosition(target, 1.3, DEFAULT_RIG);
    const d = Math.hypot(cam.x - target.x, cam.y - target.y, cam.z - target.z);
    expect(d).toBeCloseTo(DEFAULT_RIG.distance);
  });
});

describe("turnTowards", () => {
  it("rotates by at most the step toward the target", () => {
    expect(turnTowards(0, 1, 0.25)).toBeCloseTo(0.25);
  });

  it("snaps to the target when it is within one step", () => {
    expect(turnTowards(0, 0.1, 0.25)).toBeCloseTo(0.1);
  });

  it("takes the short way around the circle", () => {
    // from just below +PI to just above -PI is a tiny step, not a full turn
    const next = turnTowards(Math.PI - 0.1, -Math.PI + 0.1, 0.05);
    expect(normalizeAngle(next - (Math.PI - 0.1))).toBeCloseTo(0.05);
  });
});

describe("moveDirection", () => {
  it("W walks away from a camera that looks along -z", () => {
    const dir = moveDirection(Math.PI, 1, 0);
    expect(dir?.x).toBeCloseTo(0);
    expect(dir?.z).toBeCloseTo(-1);
  });

  it("D walks to the screen's right (+x) for a camera looking along -z", () => {
    const dir = moveDirection(Math.PI, 0, 1);
    expect(dir?.x).toBeCloseTo(1);
    expect(dir?.z).toBeCloseTo(0);
  });

  it("diagonal input is normalised", () => {
    const dir = moveDirection(0, 1, 1);
    expect(Math.hypot(dir?.x ?? 0, dir?.z ?? 0)).toBeCloseTo(1);
  });

  it("is null with no input", () => {
    expect(moveDirection(0, 0, 0)).toBeNull();
  });
});

describe("applyDrag", () => {
  it("rotates the yaw offset with horizontal drag", () => {
    expect(applyDrag(DEFAULT_RIG, 100, 0).yawOffset).not.toBe(0);
  });

  it("clamps pitch so the camera never goes under the ground or straight overhead", () => {
    expect(applyDrag(DEFAULT_RIG, 0, 100000).pitch).toBeLessThan(Math.PI / 2);
    expect(applyDrag(DEFAULT_RIG, 0, -100000).pitch).toBeGreaterThan(0);
  });
});

describe("applyZoom", () => {
  it("zooming out then back in by the same amount restores the distance", () => {
    const back = applyZoom(applyZoom(DEFAULT_RIG, 400), -400);
    expect(back.distance).toBeCloseTo(DEFAULT_RIG.distance);
  });

  it("clamps the distance", () => {
    expect(applyZoom(DEFAULT_RIG, 1e6).distance).toBeLessThan(100);
    expect(applyZoom(DEFAULT_RIG, -1e6).distance).toBeGreaterThan(1);
  });
});

describe("normalizeAngle", () => {
  it("wraps into (-PI, PI]", () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-1.5 * Math.PI)).toBeCloseTo(0.5 * Math.PI);
  });
});
