import type { TextureLoader } from "three";
import { BoxGeometry, Group, Mesh, Texture } from "three";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { fallbackLanternGeometries } from "./lantern-model";
import { buildTempleGrounds } from "./temple-grounds";

// Smoke test: builds the whole grounds with stubbed textures and canvas, so
// runtime-only errors (e.g. a const used before its declaration inside
// buildTempleGrounds) fail here instead of only in the browser.

const stubLoader = {
  loadAsync: async () => {
    await Promise.resolve();
    return new Texture();
  },
} as unknown as TextureLoader;

const wasDocumentDefined = "document" in globalThis;

beforeAll(() => {
  if (!wasDocumentDefined) {
    // No DOM in the node test environment: canvases with no 2D context.
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => null }),
    });
  }
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("buildTempleGrounds", () => {
  it("builds the grounds without throwing", async () => {
    const grounds = await buildTempleGrounds(stubLoader, 4);
    let meshes = 0;
    grounds.group.traverse((node) => {
      if (node instanceof Mesh) meshes += 1;
    });
    expect(meshes).toBeGreaterThan(100);
    expect(grounds.cameraBlockers.length).toBeGreaterThan(0);
  });

  it("runs the per-frame update", async () => {
    const grounds = await buildTempleGrounds(stubLoader, 4);
    expect(() => grounds.update(1 / 60)).not.toThrow();
  });

  it("renames a registrable cốc's sign once approved, and restores it when cleared", async () => {
    const grounds = await buildTempleGrounds(stubLoader, 4);
    expect(() => grounds.setCocOccupant("coc-mo-1", "Mạnh Dung")).not.toThrow();
    expect(() => grounds.setCocOccupant("coc-mo-1", null)).not.toThrow();
    // An id that doesn't match any cốc is silently ignored, not an error.
    expect(() => grounds.setCocOccupant("khong-ton-tai", "Ai Đó")).not.toThrow();
  });

  it("builds each cốc from the Myanmar model when one is given, and its nameplate still renames", async () => {
    const template = new Group();
    template.add(new Mesh(new BoxGeometry(2.4, 2, 2.4)));
    const grounds = await buildTempleGrounds(stubLoader, 4, fallbackLanternGeometries(), template);
    const coc = grounds.group.getObjectByName("coc-mo-1");
    expect(coc?.getObjectByName("plaque")).toBeDefined();
    expect(() => grounds.setCocOccupant("coc-mo-1", "Mạnh Dung")).not.toThrow();
    expect(() => grounds.setCocOccupant("coc-mo-1", null)).not.toThrow();
  });

  it("builds the meditation hut from the Myanmar model too, with no nameplate of its own", async () => {
    const template = new Group();
    template.add(new Mesh(new BoxGeometry(2.4, 2, 2.4)));
    const withModel = await buildTempleGrounds(stubLoader, 4, fallbackLanternGeometries(), template);
    const hut = withModel.group.getObjectByName("coc-thien");
    expect(hut?.getObjectByName("model")).toBeDefined();
    expect(hut?.getObjectByName("plaque")).toBeUndefined();
    const withoutModel = await buildTempleGrounds(stubLoader, 4);
    expect(withoutModel.group.getObjectByName("coc-thien")?.getObjectByName("model")).toBeUndefined();
  });
});
