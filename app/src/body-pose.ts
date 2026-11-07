import { computeWalkPose } from "./walk-cycle";

// monk.glb's skeleton (GLTFLoader drops the "." in "thigh.L" etc.), listed
// parents before children so a pose can be applied in this order.
export const BONE_NAMES = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "upper_armL",
  "forearmL",
  "handL",
  "upper_armR",
  "forearmR",
  "handR",
  "thighL",
  "shinL",
  "footL",
  "thighR",
  "shinR",
  "footR",
] as const;

export type BoneName = (typeof BONE_NAMES)[number];

// Rotation offsets from the rest pose, in radians, about the avatar's own
// axes: x = side-to-side (positive swings a limb forward), y = up,
// z = front-to-back.
export interface BoneRotation {
  x?: number;
  y?: number;
  z?: number;
}

export interface BodyPose {
  bones: Partial<Record<BoneName, BoneRotation>>;
  // How far the whole avatar sits below standing height.
  hipsDrop: number;
}

export const IDLE: BodyPose = { bones: {}, hipsDrop: 0 };

export function walkPose(elapsedSeconds: number): BodyPose {
  const walk = computeWalkPose(elapsedSeconds);
  return {
    bones: {
      thighL: { x: walk.thighL },
      thighR: { x: walk.thighR },
      shinL: { x: -walk.shinL },
      shinR: { x: -walk.shinR },
      upper_armL: { x: walk.upperArmL },
      upper_armR: { x: walk.upperArmR },
    },
    hipsDrop: 0,
  };
}

// Kiết già on a cushion (owner, 2026-11-07: the earlier wide-open knees
// looked wrong): thighs forward and only slightly apart, shins folded back
// and crossed in front, hands together in the lap.
export const SEATED: BodyPose = {
  bones: {
    thighL: { x: 1.5, z: -0.25 },
    thighR: { x: 1.5, z: 0.25 },
    shinL: { x: -2.45, y: 0.7 },
    shinR: { x: -2.45, y: -0.7 },
    upper_armL: { x: 0.3, z: 0.05 },
    upper_armR: { x: 0.3, z: -0.05 },
    forearmL: { x: 1.15, y: -1.3 },
    forearmR: { x: 1.15, y: 1.3 },
  },
  hipsDrop: 0.55,
};

// Palms joined in front of the chest.
export const GREET: BodyPose = {
  bones: {
    upper_armL: { x: 0.55, y: -0.75 },
    upper_armR: { x: 0.55, y: 0.75 },
    forearmL: { x: 1.55, y: -1.05 },
    forearmR: { x: 1.55, y: 1.05 },
    handL: { x: 0.4 },
    handR: { x: 0.4 },
    head: { x: -0.15 },
  },
  hipsDrop: 0,
};

// Standing bow with joined palms: bend at the waist.
export const BOW_STANDING: BodyPose = {
  bones: {
    ...GREET.bones,
    spine: { x: -0.5 },
    chest: { x: -0.3 },
    head: { x: -0.2 },
  },
  hipsDrop: 0.05,
};

// Seated bow: from the seated pose, fold forward with hands to the floor.
export const BOW_SEATED: BodyPose = {
  bones: {
    ...SEATED.bones,
    spine: { x: -0.7 },
    chest: { x: -0.4 },
    head: { x: -0.2 },
    upper_armL: { x: 1.2, z: -0.1 },
    upper_armR: { x: 1.2, z: 0.1 },
    forearmL: { x: 0.2 },
    forearmR: { x: 0.2 },
  },
  hipsDrop: 0.55,
};

// Counting beads: both hands in front of the chest, head a little down.
const BEADS_ARMS: BodyPose["bones"] = {
  upper_armL: { x: 0.45, y: -0.4 },
  upper_armR: { x: 0.45, y: 0.4 },
  forearmL: { x: 1.3, y: -0.7 },
  forearmR: { x: 1.2, y: 0.8 },
  head: { x: -0.25 },
};

export const BEADS: BodyPose = { bones: BEADS_ARMS, hipsDrop: 0 };

export const BEADS_SEATED: BodyPose = {
  bones: { ...SEATED.bones, ...BEADS_ARMS },
  hipsDrop: SEATED.hipsDrop,
};

// Both hands on the broom handle, held low in front.
export const BROOM_IDLE: BodyPose = {
  bones: {
    upper_armL: { x: 0.6, y: -0.35 },
    upper_armR: { x: 0.45, y: 0.2 },
    forearmL: { x: 0.8, y: -0.5 },
    forearmR: { x: 0.7, y: 0.3 },
  },
  hipsDrop: 0,
};

export const SWEEP_FREQUENCY = 4; // radians per second
const SWEEP_SWING = 0.35;

// Walking with the broom: legs walk, arms swing the broom side to side.
export function sweepPose(elapsedSeconds: number): BodyPose {
  const swing = Math.sin(elapsedSeconds * SWEEP_FREQUENCY) * SWEEP_SWING;
  const legs = walkPose(elapsedSeconds).bones;
  const arms = BROOM_IDLE.bones;
  return {
    bones: {
      thighL: legs.thighL,
      thighR: legs.thighR,
      shinL: legs.shinL,
      shinR: legs.shinR,
      upper_armL: { ...arms.upper_armL, y: (arms.upper_armL?.y ?? 0) + swing },
      upper_armR: { ...arms.upper_armR, y: (arms.upper_armR?.y ?? 0) + swing },
      forearmL: arms.forearmL,
      forearmR: arms.forearmR,
      chest: { y: swing * 0.5 },
    },
    hipsDrop: 0,
  };
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export function blendPose(from: BodyPose, to: BodyPose, factor: number): BodyPose {
  const k = Math.min(1, Math.max(0, factor));
  const bones: BodyPose["bones"] = {};
  for (const name of BONE_NAMES) {
    const a = from.bones[name];
    const b = to.bones[name];
    if (!a && !b) continue;
    bones[name] = {
      x: lerp(a?.x ?? 0, b?.x ?? 0, k),
      y: lerp(a?.y ?? 0, b?.y ?? 0, k),
      z: lerp(a?.z ?? 0, b?.z ?? 0, k),
    };
  }
  return { bones, hipsDrop: lerp(from.hipsDrop, to.hipsDrop, k) };
}
