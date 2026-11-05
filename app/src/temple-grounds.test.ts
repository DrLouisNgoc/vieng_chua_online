import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Mesh, Texture, type TextureLoader } from "three";
import { buildTempleGrounds } from "./temple-grounds";

// Smoke test: builds the whole grounds with stubbed textures and canvas, so
// runtime-only errors (e.g. a const used before its declaration inside
// buildTempleGrounds) fail here instead of only in the browser.

const stubLoader = {
  loadAsync: async () => new Texture(),
} as unknown as TextureLoader;

const hadDocument = "document" in globalThis;

beforeAll(() => {
  if (!hadDocument) {
    // No DOM in the node test environment: canvases with no 2D context.
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => null }),
    };
  }
});

afterAll(() => {
  if (!hadDocument) delete (globalThis as { document?: unknown }).document;
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
});
