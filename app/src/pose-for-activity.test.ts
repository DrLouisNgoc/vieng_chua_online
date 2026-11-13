import { describe, expect, it } from "vitest";

import {
  BEADS,
  BEADS_SEATED,
  BONE_NAMES,
  BOW_KNEEL,
  BOW_SEATED,
  BROOM_IDLE,
  GREET,
  IDLE,
  SEATED,
  sweepPose,
  walkPose,
} from "./body-pose";
import type { InteractionSnapshot } from "./interaction-state";
import { BOW_SECONDS } from "./interaction-state";
import { poseForActivity } from "./pose-for-activity";

const base: InteractionSnapshot = {
  activity: "idle",
  seatIndex: null,
  holdingBroom: false,
  beadsVisible: false,
};

describe("poseForActivity", () => {
  it("idles empty-handed or holding the broom", () => {
    expect(poseForActivity(base, 0, 0)).toBe(IDLE);
    expect(poseForActivity({ ...base, holdingBroom: true }, 0, 0)).toBe(BROOM_IDLE);
  });

  it("walks, or sweeps while walking with the broom", () => {
    const walking = { ...base, activity: "walking" as const };
    expect(poseForActivity(walking, 0, 0.3)).toEqual(walkPose(0.3));
    expect(poseForActivity({ ...walking, holdingBroom: true }, 0, 0.3)).toEqual(sweepPose(0.3));
  });

  it("sits, and counts beads standing or seated", () => {
    expect(poseForActivity({ ...base, activity: "seated", seatIndex: 1 }, 0, 0)).toBe(SEATED);
    expect(poseForActivity({ ...base, activity: "beads", beadsVisible: true }, 0, 0)).toBe(BEADS);
    expect(poseForActivity({ ...base, activity: "beads", seatIndex: 1, beadsVisible: true }, 0, 0)).toBe(BEADS_SEATED);
  });

  it("greets standing, and seated with the legs still crossed", () => {
    expect(poseForActivity({ ...base, activity: "greeting" }, 0.5, 0)).toBe(GREET);
    const seated = poseForActivity({ ...base, activity: "greeting", seatIndex: 2 }, 0.5, 0);
    expect(seated.bones.thighL).toEqual(SEATED.bones.thighL);
    expect(seated.bones.forearmL).toEqual(GREET.bones.forearmL);
    expect(seated.hipsDrop).toBe(SEATED.hipsDrop);
  });

  it("kneels to bow when standing (owner: làm nhân vật quỳ xuống để lạy): knees down, shins folded back, body folded forward", () => {
    const deepest = poseForActivity({ ...base, activity: "bowing" as const }, BOW_SECONDS / 2, 0);
    expect(deepest.hipsDrop).toBeGreaterThan(0.3);
    expect(deepest.bones.shinL?.x ?? 0).toBeLessThan(-2);
    expect(deepest.bones.shinR?.x ?? 0).toBeLessThan(-2);
    expect(deepest.bones.spine?.x ?? 0).toBeLessThan(-0.8);
  });

  it("bows down and comes back up over BOW_SECONDS", () => {
    const bowing = { ...base, activity: "bowing" as const };
    const deepest = poseForActivity(bowing, BOW_SECONDS / 2, 0);
    expect(deepest.bones.spine?.x).toBeCloseTo(BOW_KNEEL.bones.spine?.x ?? 0);
    const start = poseForActivity(bowing, 0, 0);
    expect(start.bones.spine?.x ?? 0).toBeCloseTo(0);
    const seatedDeepest = poseForActivity({ ...bowing, seatIndex: 0 }, BOW_SECONDS / 2, 0);
    expect(seatedDeepest.bones.spine?.x).toBeCloseTo(BOW_SEATED.bones.spine?.x ?? 0);
  });
});

describe("chanting pose", () => {
  it("joins palms standing, and seated with crossed legs", () => {
    expect(poseForActivity({ ...base, activity: "chanting" }, 3, 0)).toBe(GREET);
    const seated = poseForActivity({ ...base, activity: "chanting", seatIndex: 2 }, 3, 0);
    expect(seated.bones.thighL).toEqual(SEATED.bones.thighL);
    expect(seated.bones.forearmL).toEqual(GREET.bones.forearmL);
  });
});

describe("new named poses", () => {
  it.each([
    ["BEADS", BEADS],
    ["BEADS_SEATED", BEADS_SEATED],
    ["BROOM_IDLE", BROOM_IDLE],
    ["sweep", sweepPose(0.4)],
  ])("%s only names bones of the rig", (_name, pose) => {
    for (const bone of Object.keys(pose.bones)) expect(BONE_NAMES).toContain(bone);
  });
});
