import { describe, it, expect } from "vitest";
import {
  BONE_NAMES,
  BOW_SEATED,
  BOW_STANDING,
  GREET,
  IDLE,
  SEATED,
  blendPose,
  walkPose,
  type BodyPose,
} from "./body-pose";
import { computeWalkPose } from "./walk-cycle";

describe("walkPose", () => {
  it("keeps the existing walk cycle's angles", () => {
    for (const t of [0, 0.13, 0.5, 1.7]) {
      const old = computeWalkPose(t);
      const pose = walkPose(t);
      expect(pose.bones.thighL?.x).toBeCloseTo(old.thighL);
      expect(pose.bones.thighR?.x).toBeCloseTo(old.thighR);
      // shins bend backward, hence the sign flip the scene always applied
      expect(pose.bones.shinL?.x).toBeCloseTo(-old.shinL);
      expect(pose.bones.shinR?.x).toBeCloseTo(-old.shinR);
      expect(pose.bones.upper_armL?.x).toBeCloseTo(old.upperArmL);
      expect(pose.bones.upper_armR?.x).toBeCloseTo(old.upperArmR);
      expect(pose.hipsDrop).toBe(0);
    }
  });
});

describe("blendPose", () => {
  const from: BodyPose = { bones: { chest: { x: 1 } }, hipsDrop: 0 };
  const to: BodyPose = { bones: { chest: { y: 2 }, head: { z: -1 } }, hipsDrop: 0.4 };

  it("returns the first pose at 0 and the second at 1", () => {
    const start = blendPose(from, to, 0);
    expect(start.bones.chest).toEqual({ x: 1, y: 0, z: 0 });
    expect(start.bones.head).toEqual({ x: 0, y: 0, z: 0 });
    expect(start.hipsDrop).toBe(0);
    const end = blendPose(from, to, 1);
    expect(end.bones.chest).toEqual({ x: 0, y: 2, z: 0 });
    expect(end.bones.head).toEqual({ x: 0, y: 0, z: -1 });
    expect(end.hipsDrop).toBeCloseTo(0.4);
  });

  it("interpolates every axis and the hips drop at the midpoint", () => {
    const mid = blendPose(from, to, 0.5);
    expect(mid.bones.chest).toEqual({ x: 0.5, y: 1, z: 0 });
    expect(mid.bones.head).toEqual({ x: 0, y: 0, z: -0.5 });
    expect(mid.hipsDrop).toBeCloseTo(0.2);
  });

  it("clamps the blend factor", () => {
    expect(blendPose(from, to, 2).hipsDrop).toBeCloseTo(0.4);
    expect(blendPose(from, to, -1).hipsDrop).toBe(0);
  });
});

describe("named poses", () => {
  const poses = { IDLE, SEATED, GREET, BOW_STANDING, BOW_SEATED };

  it.each(Object.entries(poses))("%s only names bones of the rig", (_name, pose) => {
    for (const bone of Object.keys(pose.bones)) {
      expect(BONE_NAMES).toContain(bone);
    }
  });

  it("lists bones parents first", () => {
    const order = (name: string): number => BONE_NAMES.indexOf(name as never);
    expect(order("hips")).toBeLessThan(order("spine"));
    expect(order("spine")).toBeLessThan(order("chest"));
    expect(order("chest")).toBeLessThan(order("upper_armL"));
    expect(order("upper_armL")).toBeLessThan(order("forearmL"));
    expect(order("forearmL")).toBeLessThan(order("handL"));
    expect(order("thighR")).toBeLessThan(order("shinR"));
    expect(order("shinR")).toBeLessThan(order("footR"));
  });

  it("sits cross-legged (kiết già): knees close, shins crossed", () => {
    // owner, 2026-11-07: the wide-open knees looked wrong
    expect(Math.abs(SEATED.bones.thighL?.z ?? 0)).toBeLessThanOrEqual(0.3);
    expect(Math.abs(SEATED.bones.thighR?.z ?? 0)).toBeLessThanOrEqual(0.3);
    const shinL = SEATED.bones.shinL?.y ?? 0;
    const shinR = SEATED.bones.shinR?.y ?? 0;
    expect(shinL).toBeGreaterThan(0.3);
    expect(shinR).toBeLessThan(-0.3);
  });

  it("lowers the body when seated", () => {
    expect(SEATED.hipsDrop).toBeGreaterThan(0);
    expect(BOW_SEATED.hipsDrop).toBeGreaterThan(0);
  });
});
