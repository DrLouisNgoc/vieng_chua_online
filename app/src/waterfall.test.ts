import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Sprite,
  Texture,
} from "three";
import { describe, expect, it } from "vitest";

import { animateWaterfall } from "./waterfall";

function fakeTerrain(): { model: Group; falls: Mesh; spray: Mesh } {
  const model = new Group();
  const falls = new Mesh(new BufferGeometry(), new MeshStandardMaterial());
  falls.name = "waterfall";
  const spray = new Mesh(new BufferGeometry(), new MeshStandardMaterial());
  spray.name = "spray";
  // two puffs: each is a triangle whose first vertex is the spot and whose red channel is size / 100
  spray.geometry.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([10, 20, 30, 10.1, 20, 30, 10, 20, 30.1, -5, 6, 7, -4.9, 6, 7, -5, 6, 7.1]),
      3,
    ),
  );
  spray.geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array([0.9, 0, 0, 0.9, 0, 0, 0.9, 0, 0, 0.4, 0, 0, 0.4, 0, 0, 0.4, 0, 0]), 3),
  );
  model.add(falls, spray);
  return { model, falls, spray };
}

const textures = {
  streaks: () => new Texture(),
  mist: () => new Texture(),
};

describe("animateWaterfall", () => {
  it("does nothing, and says so, when the terrain has no waterfall", () => {
    expect(animateWaterfall(new Group(), textures)).toBeNull();
  });

  it("swaps the waterfall's material for a flowing, see-through water that ignores fog", () => {
    const { model, falls } = fakeTerrain();
    animateWaterfall(model, textures);
    const { material } = falls;
    expect(material).toBeInstanceOf(MeshBasicMaterial);
    if (!(material instanceof MeshBasicMaterial)) return;
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.fog).toBe(false);
    expect(material.map).not.toBeNull();
  });

  it("puts a drifting mist sprite at every spray spot and hides the spray markers", () => {
    const { model, spray } = fakeTerrain();
    animateWaterfall(model, textures);
    expect(spray.visible).toBe(false);
    const sprites = model.children.filter((node): node is Sprite => node instanceof Sprite);
    expect(sprites).toHaveLength(2);
    expect(sprites[0]?.position.toArray()).toEqual([10, 20, 30]);
    expect(sprites[0]?.scale.x).toBeGreaterThan(sprites[1]?.scale.x ?? 0); // size from the colour: 90 vs 40
  });

  it("flows: the water texture slides along the fall as time passes", () => {
    const { model, falls } = fakeTerrain();
    const update = animateWaterfall(model, textures);
    const { material } = falls;
    if (!(material instanceof MeshBasicMaterial) || !material.map) throw new TypeError("the fall has no water texture");
    const { map } = material;
    const before = map.offset.y;
    update?.(1);
    update?.(2);
    expect(map.offset.y).not.toBe(before);
  });
});
