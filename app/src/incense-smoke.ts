// Smoke rising from an incense urn after the visitor lights incense (owner, 2026-11-13: "nơi để
// thắp hương"): a short column of soft grey puffs drifting up and sideways, fading as it rises,
// for BURN_SECONDS. Purely a picture: it is not sent to other visitors.
import type { Texture } from "three";
import { CanvasTexture, Group, Sprite, SpriteMaterial, SRGBColorSpace } from "three";

export interface UrnSpot {
  x: number;
  y: number;
  z: number;
}

const BURN_SECONDS = 40;
const PUFFS = 9;
const RISE_SECONDS = 9;
const RISE_HEIGHT = 5;

function browserSmokeTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
  if (context !== null) {
    const puff = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    puff.addColorStop(0, "rgba(140,138,135,0.75)");
    puff.addColorStop(1, "rgba(140,138,135,0)");
    context.fillStyle = puff;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

// One puff on its way up: it starts at the urn, drifts a little sideways, swells and fades.
function placePuff(sprite: Sprite, urn: UrnSpot, offset: number, seconds: number): number {
  const rise = (seconds / RISE_SECONDS + offset) % 1; // 0 at the urn .. 1 at the top
  sprite.position.set(
    urn.x + Math.sin(seconds * 0.6 + offset * 9) * 0.35 * rise,
    urn.y + 0.8 + rise * RISE_HEIGHT,
    urn.z,
  );
  const size = 0.7 + rise * 2.2;
  sprite.scale.set(size, size, 1);
  return 0.7 * (1 - rise); // its opacity
}

export interface IncenseSmoke {
  group: Group;
  light: (urnIndex: number) => void;
  update: (seconds: number) => void;
}

export function createIncenseSmoke(
  urns: readonly UrnSpot[],
  makeTexture: () => Texture = browserSmokeTexture,
): IncenseSmoke {
  const group = new Group();
  group.name = "incense-smoke";
  const texture = makeTexture();
  const puffs = urns.map((urn) =>
    Array.from({ length: PUFFS }, (_, index) => {
      const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false }));
      sprite.position.set(urn.x, urn.y, urn.z);
      sprite.visible = false;
      group.add(sprite);
      return { sprite, offset: index / PUFFS };
    }),
  );
  const burnsUntil = urns.map(() => 0);
  let now = 0;

  return {
    group,
    light(urnIndex) {
      if (urnIndex >= 0 && urnIndex < urns.length) burnsUntil[urnIndex] = now + BURN_SECONDS;
    },
    update(seconds) {
      now = seconds;
      for (const [urnIndex, urn] of urns.entries()) {
        const isBurning = seconds < (burnsUntil[urnIndex] ?? 0);
        const urnPuffs = puffs[urnIndex] ?? [];
        for (const { sprite, offset } of urnPuffs) {
          sprite.visible = isBurning;
          if (isBurning) sprite.material.opacity = placePuff(sprite, urn, offset, seconds);
        }
      }
    },
  };
}
