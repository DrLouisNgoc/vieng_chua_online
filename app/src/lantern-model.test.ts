import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Box3 } from "three";
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";

import {
  buildLanternMeshes,
  extractLanternGeometries,
  fallbackLanternGeometries,
  LANTERN_SCALE,
} from "./lantern-model";

function namedMesh(name: string, geometry: BoxGeometry | SphereGeometry): Mesh {
  const mesh = new Mesh(geometry);
  mesh.name = name;
  return mesh;
}

function modelWithParts(parts: string[]): Group {
  const root = new Group();
  for (const name of parts) root.add(namedMesh(name, new SphereGeometry(0.5, 8, 6)));
  return root;
}

const ALL_PARTS = ["lantern_paper", "lantern_gold", "lantern_hanging"];

function boxOf(geometry: { computeBoundingBox: () => void; boundingBox: Box3 | null }): Box3 {
  geometry.computeBoundingBox();
  const { boundingBox } = geometry;
  if (!boundingBox) throw new Error("no bounding box");
  return boundingBox;
}

describe("extractLanternGeometries", () => {
  it("returns the three parts, scaled down to scene size", () => {
    const geometries = extractLanternGeometries(modelWithParts(ALL_PARTS));
    expect(geometries).not.toBeNull();
    expect(boxOf(geometries?.paper ?? new BoxGeometry()).max.x).toBeCloseTo(0.5 * LANTERN_SCALE);
  });

  it("bakes each mesh's own position into its geometry", () => {
    const root = modelWithParts(ALL_PARTS);
    const gold = root.children.find((child) => child.name === "lantern_gold");
    gold?.position.set(0, 1, 0);
    const box = boxOf(extractLanternGeometries(root)?.gold ?? new BoxGeometry());
    expect(box.getCenter(box.min.clone()).y).toBeCloseTo(1 * LANTERN_SCALE);
  });

  it("returns null when a part is missing, so the caller can fall back", () => {
    expect(extractLanternGeometries(modelWithParts(["lantern_paper", "lantern_gold"]))).toBeNull();
  });
});

async function loadShipped(): Promise<Group> {
  const file = readFileSync(fileURLToPath(new URL("../public/models/lantern.glb", import.meta.url)));
  const gltf = await new GLTFLoader().parseAsync(new Uint8Array(file).buffer, "");
  return gltf.scene;
}

function counts(group: Group): Record<string, number> {
  const result: Record<string, number> = {};
  for (const child of group.children) {
    if (child instanceof InstancedMesh) result[child.name] = child.count;
  }
  return result;
}

describe("the shipped lantern.glb", () => {
  it("holds the three named parts the code looks for", async () => {
    expect(extractLanternGeometries(await loadShipped())).not.toBeNull();
  });

  it("is lantern-sized, with the tassel hanging below the paper body", async () => {
    const geometries = extractLanternGeometries(await loadShipped());
    const paper = boxOf(geometries?.paper ?? new BoxGeometry());
    const hanging = boxOf(geometries?.hanging ?? new BoxGeometry());
    expect(paper.max.x - paper.min.x).toBeGreaterThan(0.4);
    expect(paper.max.x - paper.min.x).toBeLessThan(0.8);
    expect(hanging.min.y).toBeLessThan(paper.min.y - 0.1);
  });
});

describe("fallbackLanternGeometries", () => {
  it("gives a plain paper ball with caps and nothing hanging", () => {
    const fallback = fallbackLanternGeometries();
    expect(fallback.paper.getAttribute("position").count).toBeGreaterThan(0);
    expect(fallback.gold.getAttribute("position").count).toBeGreaterThan(0);
    expect(fallback.hanging).toBeNull();
  });
});

describe("buildLanternMeshes", () => {
  const materials = { paper: new MeshStandardMaterial(), gold: new MeshStandardMaterial() };
  const standing = [
    { x: 1, y: 2, z: 3 },
    { x: -1, y: 2, z: 3 },
  ];
  const hanging = [{ x: 0, y: 5, z: 0 }];

  it("draws every lantern's paper and trim, and the tassel only for hanging ones", () => {
    const geometries = extractLanternGeometries(modelWithParts(ALL_PARTS));
    if (!geometries) throw new Error("model parts missing");
    const group = buildLanternMeshes(geometries, materials, { standing, hanging });
    expect(counts(group)).toEqual({ "lantern-paper": 3, "lantern-gold": 3, "lantern-hanging": 1 });
  });

  it("adds no tassel mesh when the geometry set has none", () => {
    const group = buildLanternMeshes(fallbackLanternGeometries(), materials, { standing, hanging });
    expect(counts(group)).toEqual({ "lantern-paper": 3, "lantern-gold": 3 });
  });

  it("puts each instance at its spot", () => {
    const group = buildLanternMeshes(fallbackLanternGeometries(), materials, { standing, hanging });
    const paper = group.children.find((child) => child.name === "lantern-paper");
    if (!(paper instanceof InstancedMesh)) throw new TypeError("no paper mesh");
    const matrix = paper.instanceMatrix.array;
    // 4x4 column-major matrix: translation is elements 12..14
    expect([matrix[12], matrix[13], matrix[14]]).toEqual([1, 2, 3]);
    expect([matrix[44], matrix[45], matrix[46]]).toEqual([0, 5, 0]);
  });
});
