import { Sprite, Texture } from "three";
import { describe, expect, it } from "vitest";

import { createIncenseSmoke } from "./incense-smoke";

const fakeTexture = (): Texture => new Texture();
const urns = [
  { x: 0, y: 1, z: 13.5 },
  { x: 100, y: 2, z: 50 },
];

function visibleCount(group: { children: unknown[] }): number {
  return group.children.filter((node) => node instanceof Sprite && node.visible).length;
}

describe("createIncenseSmoke", () => {
  it("shows nothing until incense is lit", () => {
    const smoke = createIncenseSmoke(urns, fakeTexture);
    smoke.update(0);
    expect(visibleCount(smoke.group)).toBe(0);
  });

  it("rises from the urn that was lit, and only that one", () => {
    const smoke = createIncenseSmoke(urns, fakeTexture);
    smoke.update(10);
    smoke.light(1);
    smoke.update(12);
    const shown = smoke.group.children.filter((node): node is Sprite => node instanceof Sprite && node.visible);
    expect(shown.length).toBeGreaterThan(3);
    for (const sprite of shown) {
      expect(Math.abs(sprite.position.x - 100)).toBeLessThan(2);
      expect(sprite.position.y).toBeGreaterThan(2); // above the urn
    }
  });

  it("burns for a while, then the smoke thins out and stops", () => {
    const smoke = createIncenseSmoke(urns, fakeTexture);
    smoke.update(0);
    smoke.light(0);
    smoke.update(5);
    expect(visibleCount(smoke.group)).toBeGreaterThan(0);
    smoke.update(500);
    expect(visibleCount(smoke.group)).toBe(0);
  });

  it("ignores an urn that does not exist", () => {
    const smoke = createIncenseSmoke(urns, fakeTexture);
    expect(() => {
      smoke.light(7);
    }).not.toThrow();
  });
});
