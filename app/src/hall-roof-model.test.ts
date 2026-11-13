import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Object3D } from "three";
import { Box3, BoxGeometry, Group, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadHallRoof, placeHallRoof } from "./hall-roof-model";

const MODEL_URL = new URL("../public/models/hall-roof.glb", import.meta.url);

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

describe("placeHallRoof", () => {
  it("puts the model's origin on the hall's roof line and lets it cast its shadow", () => {
    const model = new Group();
    model.add(new Mesh(new BoxGeometry(1, 1, 1)));
    placeHallRoof(model, { x: 0, y: 18.25, z: -28 });
    expect(model.position.toArray()).toEqual([0, 18.25, -28]);
    for (const mesh of meshesOf(model)) expect(mesh.castShadow).toBe(true);
  });
});

describe("the shipped hall-roof.glb", () => {
  it("covers the 76 x 54 hall with eaves, and stays light", async () => {
    const file = readFileSync(fileURLToPath(MODEL_URL));
    const gltf = await new GLTFLoader().parseAsync(new Uint8Array(file).buffer, "");
    const box = new Box3().setFromObject(gltf.scene);
    const size = box.getSize(new Vector3());
    expect(size.x).toBeGreaterThan(80);
    expect(size.x).toBeLessThan(90);
    expect(size.z).toBeGreaterThan(58);
    expect(size.z).toBeLessThan(68);
    expect(box.min.y).toBeGreaterThan(-1.5);
    expect(box.min.y).toBeLessThan(0);
    const meshes = meshesOf(gltf.scene);
    expect(meshes.length).toBeLessThanOrEqual(4);
  });
});

describe("loadHallRoof", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the loaded model", async () => {
    const scene = new Group();
    const loader = { loadAsync: vi.fn().mockResolvedValue({ scene }) } as unknown as GLTFLoader;
    expect(await loadHallRoof(loader)).toBe(scene);
  });

  it("returns null and warns once when the file is missing, so the old roof is built instead", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      // silence the expected warning
    });
    const loader = { loadAsync: vi.fn().mockRejectedValue(new Error("404")) } as unknown as GLTFLoader;
    expect(await loadHallRoof(loader)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
