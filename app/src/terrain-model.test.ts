import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { MeshoptDecoder } from "meshoptimizer";
import type { Object3D } from "three";
import { Box3, BufferGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WALK_AREA } from "./terrain-layout";
import { loadTerrain, placeTerrain } from "./terrain-model";

async function parseShipped(): Promise<Group> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const bytes = readFileSync(fileURLToPath(new URL("../public/models/terrain.glb", import.meta.url)));
  const gltf = await loader.parseAsync(new Uint8Array(bytes).buffer, "");
  return gltf.scene;
}

function isMesh(node: Object3D): node is Mesh {
  return node instanceof Mesh;
}

function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((node) => {
    if (isMesh(node)) meshes.push(node);
  });
  return meshes;
}

function triangles(geometry: BufferGeometry): number {
  return (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
}

describe("the shipped terrain.glb", () => {
  it("builds nothing on the walkable land: every vertex is on or beyond its edge", async () => {
    const model = await parseShipped();
    for (const mesh of meshesOf(model)) {
      const position = mesh.geometry.getAttribute("position");
      for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const isInsideWalkArea =
          x > WALK_AREA.minX + 0.5 && x < WALK_AREA.maxX - 0.5 && z > WALK_AREA.minZ + 0.5 && z < WALK_AREA.maxZ - 0.5;
        expect(isInsideWalkArea).toBe(false);
      }
    }
  });

  it("rises to high mountains all round and runs well out from the walkable land", async () => {
    const box = new Box3().setFromObject(await parseShipped());
    expect(box.max.y).toBeGreaterThan(150);
    expect(box.min.y).toBeGreaterThan(-6);
    expect(box.max.x).toBeGreaterThan(WALK_AREA.maxX + 300);
    expect(box.min.x).toBeLessThan(WALK_AREA.minX - 300);
    expect(box.max.z).toBeGreaterThan(WALK_AREA.maxZ + 300);
    expect(box.min.z).toBeLessThan(WALK_AREA.minZ - 300);
  });

  it("is a static mesh of a few meshes and under 220k triangles, so it stays light enough to draw every frame", async () => {
    const meshes = meshesOf(await parseShipped());
    expect(meshes.length).toBeLessThanOrEqual(3);
    expect(meshes.reduce((sum, mesh) => sum + triangles(mesh.geometry), 0)).toBeLessThan(220_000);
  });
});

describe("placeTerrain and loadTerrain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("turns the fog off on every material so the ranges stay clear", () => {
    const model = new Group();
    const material = new MeshStandardMaterial();
    model.add(new Mesh(new BufferGeometry(), material));
    placeTerrain(model);
    expect(material.fog).toBe(false);
  });

  it("returns the model, or null with one warning when the file is missing", async () => {
    const scene = new Group();
    const ok = { loadAsync: vi.fn().mockResolvedValue({ scene }) } as unknown as GLTFLoader;
    expect(await loadTerrain(ok)).toBe(scene);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      // silence the expected warning
    });
    const missing = { loadAsync: vi.fn().mockRejectedValue(new Error("404")) } as unknown as GLTFLoader;
    expect(await loadTerrain(missing)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
