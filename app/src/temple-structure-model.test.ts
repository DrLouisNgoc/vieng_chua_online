import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { MeshoptDecoder } from "meshoptimizer";
import type { Object3D } from "three";
import { Box3, BoxGeometry, Group, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BOUNDARY, HALL } from "./temple-layout";
import { loadHallBody, loadPerimeterWall, placeStructure } from "./temple-structure-model";

async function parseShipped(file: string): Promise<Group> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const bytes = readFileSync(fileURLToPath(new URL(`../public/models/${file}`, import.meta.url)));
  const gltf = await loader.parseAsync(new Uint8Array(bytes).buffer, "");
  return gltf.scene;
}

function meshCount(root: Object3D): number {
  let count = 0;
  root.traverse((node) => {
    if (node instanceof Mesh) count += 1;
  });
  return count;
}

describe("the shipped hall-body.glb", () => {
  it("fits the hall's plan: walls and pillars inside its footprint, from the platform up to the roof base", async () => {
    const model = await parseShipped("hall-body.glb");
    const box = new Box3().setFromObject(model);
    expect(box.min.x).toBeGreaterThan(HALL.minX - 0.6);
    expect(box.max.x).toBeLessThan(HALL.maxX + 0.6);
    expect(box.min.z).toBeGreaterThan(HALL.minZ - 0.6);
    expect(box.max.z).toBeLessThan(HALL.maxZ + 0.1);
    expect(box.min.y).toBeCloseTo(HALL.platformHeight, 1);
    expect(box.max.y).toBeGreaterThan(HALL.roofBaseY - 0.5);
    expect(box.max.y).toBeLessThanOrEqual(HALL.roofBaseY + 0.01);
  });

  it("is light: one primitive per material, a few draw calls", async () => {
    expect(meshCount(await parseShipped("hall-body.glb"))).toBeLessThanOrEqual(6);
  });
});

describe("the shipped perimeter-wall.glb", () => {
  it("runs along the whole boundary and is as high as the old wall, plus its cap", async () => {
    const box = new Box3().setFromObject(await parseShipped("perimeter-wall.glb"));
    // the pilasters and the cap stand a little proud of the wall's centre line
    for (const [actual, wanted] of [
      [box.min.x, BOUNDARY.minX],
      [box.max.x, BOUNDARY.maxX],
      [box.min.z, BOUNDARY.minZ],
      [box.max.z, BOUNDARY.maxZ],
    ] as const) {
      expect(Math.abs(actual - wanted)).toBeLessThan(1);
    }
    expect(box.max.y).toBeGreaterThan(BOUNDARY.height);
    expect(box.max.y).toBeLessThan(BOUNDARY.height + 1.5);
  });
});

describe("placeStructure", () => {
  it("lets the model cast and receive shadows", () => {
    const model = new Group();
    const mesh = new Mesh(new BoxGeometry());
    model.add(mesh);
    placeStructure(model);
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
  });
});

describe("the loaders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("return the placed model when the file loads", async () => {
    const scene = new Group();
    const loader = { loadAsync: vi.fn().mockResolvedValue({ scene }) } as unknown as GLTFLoader;
    expect(await loadHallBody(loader)).toBe(scene);
    expect(scene.name).toBe("hall-body");
    expect(await loadPerimeterWall(loader)).toBe(scene);
    expect(scene.name).toBe("perimeter-wall");
  });

  it("return null and warn once each when a file is missing, so the old walls are built instead", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      // silence the expected warning
    });
    const loader = { loadAsync: vi.fn().mockRejectedValue(new Error("404")) } as unknown as GLTFLoader;
    expect(await loadHallBody(loader)).toBeNull();
    expect(await loadPerimeterWall(loader)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
