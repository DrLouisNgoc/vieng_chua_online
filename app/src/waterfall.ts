// The waterfall and streams that run down the mountains (owner, 2026-11-13: "thác nước siêu hùng
// vĩ chảy xuống", "có suối chạy từ đỉnh núi xuống, mây vờn"). terrain.glb carries the water as a
// ribbon mesh named "waterfall" (UV v runs down the fall) and the spray spots as a mesh named
// "spray" (one small triangle per puff: its first vertex is the spot, its red channel the size
// divided by 100). Here the ribbon gets a flowing see-through water texture and each spot a
// drifting mist sprite.
import type { Object3D } from "three";
import {
  BufferAttribute,
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  RepeatWrapping,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
} from "three";

export interface WaterfallTextures {
  streaks: () => Texture;
  mist: () => Texture;
}

const FLOW_PER_SECOND = 0.7;

// A small repeatable random stream (a linear congruential generator), so the streaks are the
// same every time.
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

// Vertical white streaks that fade out toward the two banks, tiling along the fall.
function streakTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return new Texture();
  const random = seededRandom(11);
  for (let i = 0; i < 420; i += 1) {
    const x = random() * canvas.width;
    const width = 0.8 + random() * 2.2;
    const height = 120 + random() * 520;
    const y = random() * canvas.height;
    context.fillStyle = `rgba(235, 248, 255, ${(0.25 + random() * 0.7).toFixed(2)})`;
    context.fillRect(x, y, width, height);
    context.fillRect(x, y - canvas.height, width, height); // wrap, so the texture tiles
  }
  context.globalCompositeOperation = "destination-in";
  const fade = context.createLinearGradient(0, 0, canvas.width, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(0.2, "rgba(0,0,0,1)");
  fade.addColorStop(0.8, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = fade;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

// A soft round puff of mist.
function mistTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new Texture();
  const puff = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  puff.addColorStop(0, "rgba(255,255,255,0.75)");
  puff.addColorStop(0.5, "rgba(240,248,255,0.35)");
  puff.addColorStop(1, "rgba(240,248,255,0)");
  context.fillStyle = puff;
  context.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function browserWaterfallTextures(): WaterfallTextures {
  return { streaks: streakTexture, mist: mistTexture };
}

function find(model: Object3D, name: string): Mesh | undefined {
  const found = model.getObjectByName(name);
  return found instanceof Mesh ? found : undefined;
}

// Returns the per-frame update (seconds since the scene started), or null when there is no waterfall.
export function animateWaterfall(
  model: Object3D,
  textures: WaterfallTextures = browserWaterfallTextures(),
): ((seconds: number) => void) | null {
  const falls = find(model, "waterfall");
  if (!falls) return null;
  const streaks = textures.streaks();
  falls.material = new MeshBasicMaterial({
    map: streaks,
    color: 0xe6_f4_ff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  });
  falls.castShadow = false;
  falls.receiveShadow = false;

  const sprites: { sprite: Sprite; baseY: number; size: number }[] = [];
  const spray = find(model, "spray");
  const position = spray?.geometry.getAttribute("position");
  const colour = spray?.geometry.getAttribute("color");
  if (spray && position instanceof BufferAttribute && colour instanceof BufferAttribute) {
    spray.visible = false;
    const mist = textures.mist();
    for (let v = 0; v < position.count; v += 3) {
      const material = new SpriteMaterial({
        map: mist,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        fog: false,
      });
      const sprite = new Sprite(material);
      const size = colour.getX(v) * 100;
      sprite.position.set(position.getX(v), position.getY(v), position.getZ(v));
      sprite.scale.set(size, size * 0.8, 1);
      model.add(sprite);
      sprites.push({ sprite, baseY: position.getY(v), size });
    }
  }

  return (seconds) => {
    streaks.offset.y = (seconds * FLOW_PER_SECOND) % 1; // downhill: the pattern moves toward lower v, the foot
    for (const [index, entry] of sprites.entries()) {
      const phase = seconds * 0.4 + index * 1.7;
      entry.sprite.position.y = entry.baseY + Math.sin(phase) * entry.size * 0.04;
      const pulse = 1 + 0.08 * Math.sin(phase * 1.3);
      entry.sprite.scale.set(entry.size * pulse, entry.size * 0.8 * pulse, 1);
      entry.sprite.material.opacity = 0.4 + 0.12 * Math.sin(phase * 0.9);
    }
  };
}
