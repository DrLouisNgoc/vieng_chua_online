import { describe, it, expect } from "vitest";
import { BufferAttribute, BufferGeometry, SphereGeometry } from "three";
import { simplifyGeometry, triangleCount } from "./simplify-geometry";

// Many separate small triangles, like the leaf cards of a foliage mesh.
function leafCards(count: number): BufferGeometry {
  const positions = new Float32Array(count * 9);
  for (let i = 0; i < count; i += 1) {
    const x = (i % 40) * 0.1;
    const z = Math.floor(i / 40) * 0.1;
    positions.set([x, 0, z, x + 0.05, 0, z, x, 0.05, z], i * 9);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex([...Array(count * 3).keys()]);
  return geometry;
}

describe("simplifyGeometry", () => {
  it("cuts a dense connected mesh to about the target ratio", async () => {
    const dense = new SphereGeometry(1, 128, 64);
    const simplified = await simplifyGeometry(dense, 0.1);
    expect(triangleCount(simplified)).toBeLessThanOrEqual(triangleCount(dense) * 0.12);
    expect(triangleCount(simplified)).toBeGreaterThan(0);
  });

  it("also cuts meshes made of separate leaf-like pieces", async () => {
    const leaves = leafCards(4000);
    const simplified = await simplifyGeometry(leaves, 0.1);
    expect(triangleCount(simplified)).toBeLessThanOrEqual(triangleCount(leaves) * 0.12);
    expect(triangleCount(simplified)).toBeGreaterThan(0);
  });

  it("keeps the vertex attributes and leaves the input untouched", async () => {
    const dense = new SphereGeometry(1, 64, 32);
    const before = triangleCount(dense);
    const simplified = await simplifyGeometry(dense, 0.2);
    expect(triangleCount(dense)).toBe(before);
    expect(simplified.getAttribute("normal")).toBe(dense.getAttribute("normal"));
    expect(simplified.getAttribute("uv")).toBe(dense.getAttribute("uv"));
  });

  it("returns non-indexed geometry unchanged", async () => {
    const soup = new BufferGeometry();
    soup.setAttribute("position", new BufferAttribute(new Float32Array(9), 3));
    expect(await simplifyGeometry(soup, 0.1)).toBe(soup);
  });
});
