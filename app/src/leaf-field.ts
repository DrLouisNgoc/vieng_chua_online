import type { Point } from "./movement";

// Fallen leaves under the trees, swept away by a visitor holding the broom
// (owner decision D8). Pure: the scene renders `leaves` as one
// InstancedMesh.

export interface Leaf {
  x: number;
  z: number;
  // Spin about the vertical, so instances do not all lie the same way.
  rotation: number;
}

export interface LeafFieldOptions {
  sources: readonly Point[];
  radius?: number;
  intervalSeconds?: number;
  cap?: number;
  initial?: number;
  random?: () => number;
}

export interface LeafField {
  readonly leaves: readonly Leaf[];
  // Returns true when leaves were added.
  update: (deltaSeconds: number) => boolean;
  // Removes leaves within `radius` of `point`; returns how many.
  sweep: (point: Point, radius: number) => number;
}

const DEFAULTS = { radius: 4, intervalSeconds: 1.5, cap: 120, initial: 40 };

export function createLeafField(options: LeafFieldOptions): LeafField {
  const {
    sources,
    radius = DEFAULTS.radius,
    intervalSeconds = DEFAULTS.intervalSeconds,
    cap = DEFAULTS.cap,
    initial = DEFAULTS.initial,
    random = Math.random,
  } = options;
  let leaves: Leaf[] = [];
  let sinceLastDrop = 0;

  function dropLeaf(): void {
    const source = sources[Math.floor(random() * sources.length)];
    if (!source) return;
    // sqrt spreads leaves evenly over the disc instead of bunching at its centre
    const distance = Math.sqrt(random()) * radius;
    const angle = random() * Math.PI * 2;
    leaves.push({
      x: source.x + Math.cos(angle) * distance,
      z: source.z + Math.sin(angle) * distance,
      rotation: random() * Math.PI * 2,
    });
  }

  for (let i = 0; i < Math.min(initial, cap); i += 1) dropLeaf();

  return {
    get leaves() {
      return leaves;
    },
    update(deltaSeconds) {
      sinceLastDrop += deltaSeconds;
      let added = false;
      while (sinceLastDrop >= intervalSeconds) {
        sinceLastDrop -= intervalSeconds;
        if (leaves.length < cap) {
          dropLeaf();
          added = true;
        }
      }
      return added;
    },
    sweep(point, reach) {
      const before = leaves.length;
      leaves = leaves.filter((leaf) => Math.hypot(leaf.x - point.x, leaf.z - point.z) > reach);
      return before - leaves.length;
    },
  };
}
