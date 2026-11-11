import { BufferAttribute, BufferGeometry } from "three";
import { MeshoptSimplifier } from "meshoptimizer";

// Relative to the mesh size. Topology-aware simplification stops early on
// meshes made of many separate pieces (foliage cards), so if it misses the
// target we fall back to the "sloppy" simplifier, which merges pieces.
const MAX_ERROR = 0.02;
const SLOPPY_MAX_ERROR = 0.05;
const TARGET_SLACK = 1.2;

export function triangleCount(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  return (index ? index.count : geometry.getAttribute("position").count) / 3;
}

// Returns a geometry sharing the input's vertex attributes with a reduced
// index of about `ratio` of the triangles. Non-indexed input is returned as is.
export async function simplifyGeometry(geometry: BufferGeometry, ratio: number): Promise<BufferGeometry> {
  const index = geometry.getIndex();
  if (!index) return geometry;
  await MeshoptSimplifier.ready;

  const position = geometry.getAttribute("position");
  // Read through getX/Y/Z so quantized or interleaved positions also work.
  const positions = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    positions[i * 3] = position.getX(i);
    positions[i * 3 + 1] = position.getY(i);
    positions[i * 3 + 2] = position.getZ(i);
  }
  const indices = Uint32Array.from(index.array);
  const targetIndexCount = Math.max(3, Math.floor((indices.length * ratio) / 3) * 3);

  let [reduced] = MeshoptSimplifier.simplify(indices, positions, 3, targetIndexCount, MAX_ERROR, ["Prune"]);
  if (reduced.length > targetIndexCount * TARGET_SLACK) {
    [reduced] = MeshoptSimplifier.simplifySloppy(indices, positions, 3, null, targetIndexCount, SLOPPY_MAX_ERROR);
  }

  // Draw groups are dropped: their ranges point into the old index.
  const simplified = new BufferGeometry();
  simplified.name = geometry.name;
  for (const name of Object.keys(geometry.attributes)) {
    simplified.setAttribute(name, geometry.getAttribute(name));
  }
  simplified.setIndex(new BufferAttribute(reduced, 1));
  return simplified;
}
