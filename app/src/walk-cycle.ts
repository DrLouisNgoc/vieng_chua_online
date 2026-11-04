export interface WalkPose {
  thighL: number;
  thighR: number;
  shinL: number;
  shinR: number;
  upperArmL: number;
  upperArmR: number;
}

const STEP_FREQUENCY = 6; // radians of gait phase per second
const THIGH_SWING = 0.5;
const SHIN_SWING = 0.4;
const ARM_SWING = 0.4;

export const IDLE_POSE: WalkPose = {
  thighL: 0,
  thighR: 0,
  shinL: 0,
  shinR: 0,
  upperArmL: 0,
  upperArmR: 0,
};

export function computeWalkPose(elapsedSeconds: number): WalkPose {
  const phase = elapsedSeconds * STEP_FREQUENCY;
  const strideL = Math.sin(phase);
  const strideR = -strideL;

  return {
    thighL: strideL * THIGH_SWING,
    thighR: strideR * THIGH_SWING,
    // knee bends while that leg is swinging forward (stride > 0)
    shinL: Math.max(0, strideL) * SHIN_SWING,
    shinR: Math.max(0, strideR) * SHIN_SWING,
    upperArmL: strideR * ARM_SWING,
    upperArmR: strideL * ARM_SWING,
  };
}
