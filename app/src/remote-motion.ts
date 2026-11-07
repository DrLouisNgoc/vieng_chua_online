// Smoothing for other visitors' avatars between the server's 10 Hz updates.

const SMOOTHING_RATE = 12; // per second
// Farther than this, a remote avatar snaps instead of gliding there.
const TELEPORT_DISTANCE = 8;

export function smoothingFactor(deltaSeconds: number): number {
  return 1 - Math.exp(-SMOOTHING_RATE * deltaSeconds);
}

export function approach(current: number, target: number, factor: number): number {
  if (Math.abs(target - current) > TELEPORT_DISTANCE) return target;
  return current + (target - current) * factor;
}

// Like approach, but for headings: always turns the short way round.
export function approachAngle(current: number, target: number, factor: number): number {
  const turn = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + turn * factor;
}
