import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Group } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ROBE_MATERIAL_NAME } from "./avatar-look";
import { BONE_NAMES } from "./body-pose";
import { loadMonkOrFallback } from "./monk-model";

describe("loadMonkOrFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the Nam tông model when it loads, and never touches the original", async () => {
    const namTong = new Group();
    const original = vi.fn().mockResolvedValue(new Group());
    expect(await loadMonkOrFallback(vi.fn().mockResolvedValue(namTong), original)).toBe(namTong);
    expect(original).not.toHaveBeenCalled();
  });

  it("warns once and uses the original monk when the Nam tông file is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      // silence the expected warning
    });
    const original = new Group();
    const result = await loadMonkOrFallback(
      vi.fn().mockRejectedValue(new Error("404")),
      vi.fn().mockResolvedValue(original),
    );
    expect(result).toBe(original);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

interface GlbJson {
  nodes: { name?: string }[];
  materials: { name?: string }[];
  skins: unknown[];
  meshes: unknown[];
}

// The JSON chunk of a .glb: header (12 bytes), then chunk length, type, data.
function readGlbJson(url: URL): GlbJson {
  const file = readFileSync(fileURLToPath(url));
  const length = file.readUInt32LE(12);
  return JSON.parse(file.subarray(20, 20 + length).toString("utf8")) as GlbJson;
}

describe("the shipped monk-nam-tong.glb", () => {
  const glb = readGlbJson(new URL("../public/models/monk-nam-tong.glb", import.meta.url));

  it("has the 17 bones body-pose.ts poses, under the names GLTFLoader gives them", () => {
    const names = new Set(glb.nodes.map((node) => node.name?.replaceAll(".", "")));
    for (const bone of BONE_NAMES) expect(names.has(bone)).toBe(true);
  });

  it("has the robe material avatar-look.ts tints, and is one skinned figure", () => {
    expect(glb.materials.map((material) => material.name)).toContain(ROBE_MATERIAL_NAME);
    expect(glb.skins).toHaveLength(1);
    expect(glb.meshes.length).toBeLessThanOrEqual(6);
  });
});
