import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { BufferGeometry, Object3D } from "three";
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, PointLight, Texture, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildMyanmarCoc, COC_MODEL_SIZE, loadCocTemplate } from "./coc-model";

const MODEL_URL = new URL("../public/models/coc.glb", import.meta.url);

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

function templateHut(): Group {
  const root = new Group();
  root.add(new Mesh(new BoxGeometry(COC_MODEL_SIZE, 2, COC_MODEL_SIZE), new MeshStandardMaterial()));
  return root;
}

// A stand-in for the app's canvas nameplate: remembers what text it was asked to draw.
function texturesFor(texts: string[]): (text: string) => Texture {
  return (text) => {
    texts.push(text);
    return new Texture();
  };
}

const PLAQUE_SIZE_KEY = "plaque";

function build(size: number, texts: string[] = []) {
  return buildMyanmarCoc({
    template: templateHut(),
    size,
    title: "Cốc Thử",
    makePlaqueTexture: texturesFor(texts),
    lampColor: 0xff_c4_69,
  });
}

function plaqueOf(group: Group): Mesh {
  const plaque = group.getObjectByName(PLAQUE_SIZE_KEY);
  if (!plaque || !isMesh(plaque)) throw new TypeError("no nameplate in the hut");
  return plaque;
}

describe("buildMyanmarCoc", () => {
  it("fits the model to the cốc's size", () => {
    const { group } = build(COC_MODEL_SIZE * 1.5);
    const box = new Box3().setFromObject(group.getObjectByName("model") ?? group);
    expect(box.getSize(new Vector3()).x).toBeCloseTo(COC_MODEL_SIZE * 1.5);
  });

  it("names the hut with a nameplate in front of the east wall, above the door", () => {
    const texts: string[] = [];
    const { group } = build(COC_MODEL_SIZE, texts);
    const plaque = plaqueOf(group);
    expect(texts).toEqual(["Cốc Thử"]);
    expect(plaque.position.x).toBeGreaterThan(COC_MODEL_SIZE / 2);
    expect(plaque.position.y).toBeGreaterThan(1.85);
    expect(plaque.position.y).toBeLessThan(2.35);
  });

  it("renames the nameplate on demand", () => {
    const texts: string[] = [];
    const { group, setPlaqueText } = build(COC_MODEL_SIZE, texts);
    const before = (plaqueOf(group).material as MeshStandardMaterial).map;
    setPlaqueText("Cốc Mạnh Dung");
    expect(texts).toEqual(["Cốc Thử", "Cốc Mạnh Dung"]);
    expect((plaqueOf(group).material as MeshStandardMaterial).map).not.toBe(before);
  });

  it("keeps a small lamp inside so the room does not read as black", () => {
    const { group } = build(COC_MODEL_SIZE);
    const lamps: PointLight[] = [];
    group.traverse((node) => {
      if (node instanceof PointLight) lamps.push(node);
    });
    expect(lamps).toHaveLength(1);
    expect(Math.abs(lamps[0]?.position.x ?? 99)).toBeLessThan(COC_MODEL_SIZE / 2);
    expect(lamps[0]?.castShadow).toBe(false);
  });

  it("casts no shadow of its own (a roof shadow on a hut this small reads as solid black)", () => {
    const { group } = build(COC_MODEL_SIZE);
    for (const mesh of meshesOf(group)) {
      expect(mesh.castShadow).toBe(false);
    }
  });
});

async function loadShipped(): Promise<Group> {
  const file = readFileSync(fileURLToPath(MODEL_URL));
  const gltf = await new GLTFLoader().parseAsync(new Uint8Array(file).buffer, "");
  return gltf.scene;
}

describe("the shipped coc.glb", () => {
  it("is a light model: few meshes, few triangles", async () => {
    const meshes = meshesOf(await loadShipped());
    const triangles = meshes.reduce((sum, mesh) => sum + triangleCount(mesh.geometry), 0);
    expect(meshes.length).toBeLessThanOrEqual(8);
    expect(triangles).toBeLessThan(3000);
  });

  it("stands on the ground with a 2.4 m body under wide eaves, a gold spire on top", async () => {
    const size = new Box3().setFromObject(await loadShipped()).getSize(new Vector3());
    const box = new Box3().setFromObject(await loadShipped());
    expect(box.min.y).toBeCloseTo(0, 1);
    expect(size.x).toBeGreaterThan(COC_MODEL_SIZE + 0.4);
    expect(size.x).toBeLessThan(COC_MODEL_SIZE + 2.2);
    expect(size.y).toBeGreaterThan(5);
    expect(size.y).toBeLessThan(7);
  });
});

describe("loadCocTemplate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the loaded model", async () => {
    const scene = new Group();
    const loader = { loadAsync: vi.fn().mockResolvedValue({ scene }) } as unknown as GLTFLoader;
    expect(await loadCocTemplate(loader)).toBe(scene);
  });

  it("returns null and warns once when the file is missing, so the old hut is built instead", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      // silence the expected warning
    });
    const loader = { loadAsync: vi.fn().mockRejectedValue(new Error("404")) } as unknown as GLTFLoader;
    expect(await loadCocTemplate(loader)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
