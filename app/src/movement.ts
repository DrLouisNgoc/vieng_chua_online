export interface Point {
  x: number;
  z: number;
}

export interface MovementControllerOptions {
  start: Point;
  speedUnitsPerSecond?: number;
  constrain?: (from: Point, to: Point) => Point;
}

export interface MovementController {
  readonly position: Point;
  readonly isWalking: boolean;
  readonly facingAngle: number;
  moveTo: (target: Point) => void;
  stop: () => void;
  update: (deltaSeconds: number) => Point;
}

const DEFAULT_SPEED_UNITS_PER_SECOND = 2.4;

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

export function createMovementController(
  options: MovementControllerOptions,
): MovementController {
  const speed =
    options.speedUnitsPerSecond ?? DEFAULT_SPEED_UNITS_PER_SECOND;
  let position: Point = { ...options.start };
  let target: Point | null = null;
  let facingAngle = 0;

  function moveTo(nextTarget: Point): void {
    if (distance(position, nextTarget) < 1e-6) {
      target = null;
      return;
    }
    target = { ...nextTarget };
    facingAngle = Math.atan2(target.x - position.x, target.z - position.z);
  }

  function update(deltaSeconds: number): Point {
    if (target === null) {
      return position;
    }
    const remaining = distance(position, target);
    const step = speed * deltaSeconds;
    let next: Point;
    if (step >= remaining) {
      next = { ...target };
      target = null;
    } else {
      const ratio = step / remaining;
      next = {
        x: position.x + (target.x - position.x) * ratio,
        z: position.z + (target.z - position.z) * ratio,
      };
    }
    position = options.constrain ? options.constrain(position, next) : next;
    return position;
  }

  function stop(): void {
    target = null;
  }

  return {
    get position() {
      return position;
    },
    get isWalking() {
      return target !== null;
    },
    get facingAngle() {
      return facingAngle;
    },
    moveTo,
    stop,
    update,
  };
}
