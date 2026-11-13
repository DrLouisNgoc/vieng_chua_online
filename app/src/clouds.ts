// Clouds drifting round the mountains (owner, 2026-11-13: "mây vờn càng tốt"). Soft sprite
// puffs gathered into clusters on a ring beyond the walkable land, at mid and high altitude, turning
// very slowly round it. Sprites ignore fog and are unlit, so they are dimmed by hand at night.
import type { Texture } from "three";
import { CanvasTexture, Color, Group, Sprite, SpriteMaterial, SRGBColorSpace } from "three";

import { WALK_AREA } from "./terrain-layout";

const CLUSTERS = 26;
const PUFFS_PER_CLUSTER = 5;
const RING_FROM = 480;
const RING_TO = 700;
const HEIGHT_FROM = 80;
const HEIGHT_TO = 250;
const DRIFT_RADIANS_PER_SECOND = 0.004;
const DAY_OPACITY = 0.38;
const NIGHT_OPACITY = 0.18;
const NIGHT_COLOUR = new Color(0x5a_68_96);

// The same pseudo-random numbers every time (a linear congruential generator).
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

// A fluffy blob: a few overlapping soft discs.
function browserCloudTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
  const random = seededRandom(5);
  for (let i = 0; context !== null && i < 9; i += 1) {
    const x = 50 + random() * 156;
    const y = 44 + random() * 40;
    const radius = 34 + random() * 30;
    const disc = context.createRadialGradient(x, y, 0, x, y, radius);
    disc.addColorStop(0, "rgba(255,255,255,0.55)");
    disc.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = disc;
    context.fillRect(0, 0, 256, 128);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export interface Clouds {
  group: Group;
  update: (seconds: number) => void;
  // 0 by day, 1 at full night.
  setNight: (level: number) => void;
}

export function createClouds(makeTexture: () => Texture = browserCloudTexture): Clouds {
  const group = new Group();
  group.name = "clouds";
  group.position.set((WALK_AREA.minX + WALK_AREA.maxX) / 2, 0, (WALK_AREA.minZ + WALK_AREA.maxZ) / 2);
  const random = seededRandom(23);
  const texture = makeTexture();
  const materials: SpriteMaterial[] = [];
  for (let cluster = 0; cluster < CLUSTERS; cluster += 1) {
    const angle = random() * Math.PI * 2;
    const radius = RING_FROM + random() * (RING_TO - RING_FROM);
    const height = HEIGHT_FROM + random() * (HEIGHT_TO - HEIGHT_FROM);
    for (let puff = 0; puff < PUFFS_PER_CLUSTER; puff += 1) {
      const material = new SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: DAY_OPACITY,
        depthWrite: false,
        fog: false,
      });
      const sprite = new Sprite(material);
      sprite.position.set(
        Math.cos(angle) * radius + (random() - 0.5) * 160,
        height + (random() - 0.5) * 30,
        Math.sin(angle) * radius + (random() - 0.5) * 160,
      );
      const size = 100 + random() * 110;
      sprite.scale.set(size * 1.6, size * 0.8, 1);
      group.add(sprite);
      materials.push(material);
    }
  }
  return {
    group,
    update(seconds) {
      group.rotation.y = seconds * DRIFT_RADIANS_PER_SECOND;
    },
    setNight(level) {
      for (const material of materials) {
        material.color.set(0xff_ff_ff).lerp(NIGHT_COLOUR, level);
        material.opacity = DAY_OPACITY + (NIGHT_OPACITY - DAY_OPACITY) * level;
      }
    },
  };
}
