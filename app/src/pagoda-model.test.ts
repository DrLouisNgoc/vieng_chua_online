import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { MeshoptDecoder } from "meshoptimizer";
import type { Material, Object3D } from "three";
import { Box3, BufferGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isInside } from "./collision";
import { loadPagoda, placePagoda } from "./pagoda-model";
import { BOUNDARY, BROADLEAF_TREES, PAGODA, PINE_POSITIONS } from "./temple-layout";

const MODEL_URL = new URL("../public/models/pagoda.glb", import.meta.url);

async function parseShipped(): Promise<Group> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const file = readFileSync(fileURLToPath(MODEL_URL));
  const gltf = await loader.parseAsync(new Uint8Array(file).buffer, "");
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

function triangleCount(geometry: BufferGeometry): number {
  return (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
}

describe("the pagoda's place in the layout", () => {
  const half = PAGODA.halfSize;
  const footprint = { minX: PAGODA.x - half, maxX: PAGODA.x + half, minZ: PAGODA.z - half, maxZ: PAGODA.z + half };

  it("stands wholly outside the perimeter wall, so nobody can walk into it", () => {
    for (const corner of [
      { x: footprint.minX, z: footprint.minZ },
      { x: footprint.minX, z: footprint.maxZ },
      { x: footprint.maxX, z: footprint.minZ },
      { x: footprint.maxX, z: footprint.maxZ },
    ]) {
      expect(isInside(corner, BOUNDARY)).toBe(false);
    }
    expect(footprint.minX).toBeGreaterThan(BOUNDARY.maxX);
  });

  it("leaves the rows of trees outside the wall alone", () => {
    for (const tree of [...PINE_POSITIONS, ...BROADLEAF_TREES]) {
      expect(isInside(tree, footprint)).toBe(false);
    }
  });
});

describe("the shipped pagoda.glb", () => {
  it("stays light: a few draw calls, a modest triangle count, a small file", async () => {
    const meshes = meshesOf(await parseShipped());
    const triangles = meshes.reduce((sum, mesh) => sum + triangleCount(mesh.geometry), 0);
    expect(meshes.length).toBeLessThanOrEqual(12);
    expect(triangles).toBeLessThan(90_000);
    expect(statSync(fileURLToPath(MODEL_URL)).size).toBeLessThan(1_500_000);
  });

  it("is the whole complex: a plaza about 210 m across with a spire taller than 50 m", async () => {
    const size = new Box3().setFromObject(await parseShipped()).getSize(new Vector3());
    expect(size.x).toBeGreaterThan(200);
    expect(size.x).toBeLessThan(230);
    expect(size.y).toBeGreaterThan(50);
    expect(size.y).toBeLessThan(80);
  });
});

function fakeModel(): Group {
  const root = new Group();
  const mesh = new Mesh(new BufferGeometry(), [new MeshStandardMaterial(), new MeshStandardMaterial()]);
  root.add(mesh, new Mesh(new BufferGeometry(), new MeshStandardMaterial()));
  return root;
}

describe("placePagoda", () => {
  it("puts the model at the layout's spot, scale and heading", () => {
    const root = fakeModel();
    placePagoda(root);
    expect([root.position.x, root.position.z]).toEqual([PAGODA.x, PAGODA.z]);
    expect(root.position.y).toBe(PAGODA.groundY);
    expect(root.scale.x).toBe(PAGODA.scale);
    expect(root.rotation.y).toBe(PAGODA.rotationY);
  });

  it("keeps the fog off every material, so it stands out as a far landmark", () => {
    const root = fakeModel();
    placePagoda(root);
    for (const mesh of meshesOf(root)) {
      const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) expect("fog" in material && material.fog).toBe(false);
    }
  });
});

describe("loadPagoda", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the placed model when the file loads", async () => {
    const loader = { loadAsync: vi.fn().mockResolvedValue({ scene: new Group() }) } as unknown as GLTFLoader;
    const model = await loadPagoda(loader);
    expect(model?.position.x).toBe(PAGODA.x);
  });

  it("returns null and warns once, instead of failing, when the file is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      /*
      silence the expected warning
      */
    });
    const loader = { loadAsync: vi.fn().mockRejectedValue(new Error("404")) } as unknown as GLTFLoader;
    expect(await loadPagoda(loader)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
