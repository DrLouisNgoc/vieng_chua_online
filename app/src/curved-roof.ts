// Vietnamese-style hip roof as raw vertex data (no three.js dependency):
// concave slopes, eave corners turned up and flared out ("đầu đao").
// The ridge runs along x; the eave rectangle is centred on the origin at
// y = 0. A topFraction < 1 cuts the roof into a band (a lower roof tier).

export interface CurvedRoofOptions {
  halfWidth: number;
  halfDepth: number;
  height: number; // ridge height above the eave line
  upturn: number; // extra height at the four eave corners
  sag?: number; // >1 = concave profile (flat at the eave, steep near the ridge)
  flare?: number; // how far corners push outward, as a fraction of their extent
  topFraction?: number;
  segments?: number;
}

export interface RoofMesh {
  positions: number[];
  uvs: number[];
  indices: number[];
}

const DEFAULTS = { sag: 1.6, flare: 0.06, topFraction: 1, segments: 16 };

type XZ = [number, number];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function ridgeHalfLength(o: CurvedRoofOptions): number {
  return Math.max(0, o.halfWidth - o.halfDepth);
}

export function innerEdge(o: CurvedRoofOptions): {
  halfWidth: number;
  halfDepth: number;
  y: number;
} {
  const t = o.topFraction ?? DEFAULTS.topFraction;
  const sag = o.sag ?? DEFAULTS.sag;
  return {
    halfWidth: lerp(o.halfWidth, ridgeHalfLength(o), t),
    halfDepth: lerp(o.halfDepth, 0, t),
    y: o.height * Math.pow(t, sag),
  };
}

export function buildCurvedHipRoof(options: CurvedRoofOptions): RoofMesh {
  const o = { ...DEFAULTS, ...options };
  const W = o.halfWidth;
  const D = o.halfDepth;
  const R = ridgeHalfLength(o);

  // each face: eave start/end and ridge start/end, walked in the same direction
  const faces: [XZ, XZ, XZ, XZ][] = [
    [
      [-W, D],
      [W, D],
      [-R, 0],
      [R, 0],
    ], // front (+z)
    [
      [W, D],
      [W, -D],
      [R, 0],
      [R, 0],
    ], // right (+x)
    [
      [W, -D],
      [-W, -D],
      [R, 0],
      [-R, 0],
    ], // back (-z)
    [
      [-W, -D],
      [-W, D],
      [-R, 0],
      [-R, 0],
    ], // left (-x)
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const n = o.segments;

  for (const [e0, e1, r0, r1] of faces) {
    const eaveLength = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]);
    const slantLength = Math.hypot(o.height, D);
    const first = positions.length / 3;
    for (let j = 0; j <= n; j += 1) {
      const v = (j / n) * o.topFraction;
      for (let i = 0; i <= n; i += 1) {
        const u = i / n;
        const cornerness = Math.pow(Math.abs(2 * u - 1), 4);
        const nearEave = (1 - v) * (1 - v);
        const ex = lerp(e0[0], e1[0], u);
        const ez = lerp(e0[1], e1[1], u);
        const rx = lerp(r0[0], r1[0], u);
        const rz = lerp(r0[1], r1[1], u);
        const spread = 1 + o.flare * cornerness * nearEave;
        positions.push(
          lerp(ex, rx, v) * spread,
          o.height * Math.pow(v, o.sag) + o.upturn * cornerness * nearEave,
          lerp(ez, rz, v) * spread,
        );
        uvs.push(u * eaveLength, v * slantLength);
      }
    }
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const a = first + j * (n + 1) + i;
        const b = a + 1;
        const c = a + (n + 1);
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  return { positions, uvs, indices };
}
