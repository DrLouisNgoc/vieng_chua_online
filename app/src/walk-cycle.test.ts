import { describe, expect, it } from "vitest";

import { computeWalkPose } from "./walk-cycle";

describe("computeWalkPose", () => {
  it("returns the neutral pose at time zero", () => {
    const pose = computeWalkPose(0);
    expect(pose.thighL).toBeCloseTo(0);
    expect(pose.thighR).toBeCloseTo(0);
  });

  it("swings the two thighs in opposite phase", () => {
    const pose = computeWalkPose(0.3);
    expect(pose.thighL).toBeCloseTo(-pose.thighR);
  });

  it("swings the opposite-side arm in sync with each leg (contralateral gait)", () => {
    const pose = computeWalkPose(0.3);
    // same sign as the opposite-side thigh (arms swing less far than legs,
    // so only the phase relationship is checked, not the exact magnitude).
    expect(Math.sign(pose.upperArmL)).toBe(Math.sign(pose.thighR));
    expect(Math.sign(pose.upperArmR)).toBe(Math.sign(pose.thighL));
  });

  it("is periodic", () => {
    const period = (2 * Math.PI) / 6; // matches the module's step frequency
    const a = computeWalkPose(0.37);
    const b = computeWalkPose(0.37 + period);
    expect(b.thighL).toBeCloseTo(a.thighL, 5);
  });
});
