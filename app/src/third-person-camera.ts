// Third-person follow camera, as pure functions. Heading uses the same
// convention as movement.ts: the avatar faces (sin heading, cos heading).

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraRig {
  yawOffset: number; // orbit around the avatar from dragging, added to the base yaw
  pitch: number; // radians above the horizon
  distance: number;
}

const MIN_PITCH = 0.05;
const MAX_PITCH = 1.3;
const MIN_DISTANCE = 2.5;
const MAX_DISTANCE = 30;
const DRAG_YAW_PER_PX = 0.005;
const DRAG_PITCH_PER_PX = 0.004;
const ZOOM_PER_WHEEL_UNIT = 0.001;

export const DEFAULT_RIG: CameraRig = { yawOffset: 0, pitch: 0.32, distance: 6 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAngle(angle: number): number {
  return angle - 2 * Math.PI * Math.ceil((angle - Math.PI) / (2 * Math.PI));
}

export function desiredCameraPosition(target: Vec3, heading: number, rig: CameraRig): Vec3 {
  const yaw = heading + rig.yawOffset;
  const horizontal = rig.distance * Math.cos(rig.pitch);
  return {
    x: target.x - Math.sin(yaw) * horizontal,
    y: target.y + rig.distance * Math.sin(rig.pitch),
    z: target.z - Math.cos(yaw) * horizontal,
  };
}

// Rotate `current` toward `target` by at most `maxStep`, the short way round.
export function turnTowards(current: number, target: number, maxStep: number): number {
  const diff = normalizeAngle(target - current);
  if (Math.abs(diff) <= maxStep) return current + diff;
  return current + Math.sign(diff) * maxStep;
}

// Camera-relative walking direction: W/S along where the camera looks,
// A/D to its left/right. Null when no direction key is held.
export function moveDirection(cameraYaw: number, forward: number, right: number): { x: number; z: number } | null {
  const x = Math.sin(cameraYaw) * forward - Math.cos(cameraYaw) * right;
  const z = Math.cos(cameraYaw) * forward + Math.sin(cameraYaw) * right;
  const length = Math.hypot(x, z);
  if (length < 1e-6) return null;
  return { x: x / length, z: z / length };
}

export function applyDrag(rig: CameraRig, dx: number, dy: number): CameraRig {
  return {
    ...rig,
    yawOffset: normalizeAngle(rig.yawOffset - dx * DRAG_YAW_PER_PX),
    pitch: clamp(rig.pitch + dy * DRAG_PITCH_PER_PX, MIN_PITCH, MAX_PITCH),
  };
}

export function applyZoom(rig: CameraRig, wheelDeltaY: number): CameraRig {
  return {
    ...rig,
    distance: clamp(rig.distance * Math.exp(wheelDeltaY * ZOOM_PER_WHEEL_UNIT), MIN_DISTANCE, MAX_DISTANCE),
  };
}
