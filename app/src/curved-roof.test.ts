import { describe, it, expect } from "vitest";
import { buildCurvedHipRoof, innerEdge, type CurvedRoofOptions } from "./curved-roof";

const base: CurvedRoofOptions = {
  halfWidth: 10,
  halfDepth: 6,
  height: 4,
  upturn: 1,
  segments: 8,
};

function ys(positions: number[]): number[] {
  return positions.filter((_, i) => i % 3 === 1);
}

function vertexAt(positions: number[], x: number, z: number): number | undefined {
  for (let i = 0; i < positions.length; i += 3) {
    if (Math.abs((positions[i] ?? NaN) - x) < 1e-6 && Math.abs((positions[i + 2] ?? NaN) - z) < 1e-6) {
      return positions[i + 1];
    }
  }
  return undefined;
}

describe("buildCurvedHipRoof", () => {
  it("rises to the ridge height", () => {
    const roof = buildCurvedHipRoof(base);
    expect(Math.max(...ys(roof.positions))).toBeCloseTo(base.height);
  });

  it("turns the eave corners up (dau dao) above the middle of the eave", () => {
    const roof = buildCurvedHipRoof({ ...base, flare: 0 });
    const corner = vertexAt(roof.positions, base.halfWidth, base.halfDepth);
    const middle = vertexAt(roof.positions, 0, base.halfDepth);
    expect(corner).toBeCloseTo(base.upturn);
    expect(middle).toBeCloseTo(0);
  });

  it("is concave: halfway up the slope it is below half the ridge height", () => {
    const roof = buildCurvedHipRoof({ ...base, upturn: 0, flare: 0, segments: 2 });
    // front face centre line, v = 0.5: x = 0, z = halfDepth / 2
    const y = vertexAt(roof.positions, 0, base.halfDepth / 2);
    expect(y).toBeDefined();
    expect(y ?? Infinity).toBeLessThan(base.height / 2);
  });

  it("a truncated tier (topFraction < 1) stops below the ridge", () => {
    const roof = buildCurvedHipRoof({ ...base, topFraction: 0.5 });
    expect(Math.max(...ys(roof.positions))).toBeLessThan(base.height);
  });

  it("produces 4 faces of segments x segments quads with valid indices", () => {
    const roof = buildCurvedHipRoof(base);
    const segments = base.segments ?? 0;
    expect(roof.indices.length).toBe(4 * segments * segments * 6);
    const vertexCount = roof.positions.length / 3;
    expect(Math.max(...roof.indices)).toBeLessThan(vertexCount);
    expect(roof.uvs.length / 2).toBe(vertexCount);
  });
});

describe("innerEdge", () => {
  it("describes where a truncated tier ends, for placing the next tier", () => {
    const edge = innerEdge({ ...base, topFraction: 0.5 });
    expect(edge.halfDepth).toBeCloseTo(3);
    // ridge half-length is halfWidth - halfDepth = 4; halfway from 10 to 4 is 7
    expect(edge.halfWidth).toBeCloseTo(7);
    expect(edge.y).toBeGreaterThan(0);
    expect(edge.y).toBeLessThan(base.height / 2);
  });
});
