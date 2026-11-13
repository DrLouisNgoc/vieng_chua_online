import { Sprite, Texture } from "three";
import { describe, expect, it } from "vitest";

import { createClouds } from "./clouds";
import { WALK_AREA } from "./terrain-layout";

const fakeTexture = (): Texture => new Texture();

function spritesOf(group: { children: unknown[] }): Sprite[] {
  return group.children.filter((node): node is Sprite => node instanceof Sprite);
}

describe("createClouds", () => {
  it("scatters many soft puffs round the mountains, high above the walkable land", () => {
    const { group } = createClouds(fakeTexture);
    const sprites = spritesOf(group);
    expect(sprites.length).toBeGreaterThan(100);
    const centre = { x: (WALK_AREA.minX + WALK_AREA.maxX) / 2, z: (WALK_AREA.minZ + WALK_AREA.maxZ) / 2 };
    for (const sprite of sprites) {
      expect(sprite.position.y).toBeGreaterThan(40);
      expect(sprite.position.y).toBeLessThan(320);
      // beyond the walkable land's far corner, so a cloud never hangs over the temple
      expect(Math.hypot(sprite.position.x - centre.x, sprite.position.z - centre.z)).toBeGreaterThan(330);
    }
  });

  it("puts the same clouds in the same places every time", () => {
    const first = spritesOf(createClouds(fakeTexture).group).map((sprite) => sprite.position.toArray());
    const second = spritesOf(createClouds(fakeTexture).group).map((sprite) => sprite.position.toArray());
    expect(second).toEqual(first);
  });

  it("drifts slowly round the mountains as time passes", () => {
    const { group, update } = createClouds(fakeTexture);
    const before = group.rotation.y;
    update(0);
    update(100);
    expect(group.rotation.y).not.toBe(before);
    expect(Math.abs(group.rotation.y - before)).toBeLessThan(1); // slowly: under a radian in 100 s
  });

  it("darkens and thins at night, so they are not bright white clouds under a night sky", () => {
    const { group, setNight } = createClouds(fakeTexture);
    const sprite = spritesOf(group).at(0);
    if (!sprite) throw new TypeError("no cloud puffs");
    setNight(0);
    const day = { brightness: sprite.material.color.r, opacity: sprite.material.opacity };
    setNight(1);
    expect(sprite.material.color.r).toBeLessThan(day.brightness);
    expect(sprite.material.opacity).toBeLessThan(day.opacity);
  });
});
