import type { Material } from "three";
import {
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  type Object3D,
} from "three";

// How a visitor looks to others: robe colour (decision 0010) and a name
// label above the head.

// monk.glb's robe body material; the saffron outer wrap stays as it is.
export const ROBE_MATERIAL_NAME = "Soft sage linen";
const TINTED_FLAG = "robeTinted";

// Recolours the robe on this avatar only: the material is cloned the first
// time, since clones of the model share their materials.
export function tintRobe(avatar: Object3D, color: string): void {
  avatar.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const material = node.material as Material;
    if (!(material instanceof MeshStandardMaterial) || material.name !== ROBE_MATERIAL_NAME) return;
    let own = material;
    if (!material.userData[TINTED_FLAG]) {
      own = material.clone();
      own.userData[TINTED_FLAG] = true;
      node.material = own;
    }
    own.color.set(color);
  });
}

export function labelText(name: string, beadsVisible: boolean, beadTotal: number): string {
  return beadsVisible ? `${name} · ${beadTotal.toLocaleString("vi-VN")} hạt` : name;
}

export interface NameLabel {
  sprite: Sprite;
  setText: (text: string) => void;
}

const LABEL_WIDTH_PX = 512;
const LABEL_HEIGHT_PX = 96;
const LABEL_WORLD_HEIGHT = 0.32;

export function createNameLabel(): NameLabel {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_WIDTH_PX;
  canvas.height = LABEL_HEIGHT_PX;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set((LABEL_WORLD_HEIGHT * LABEL_WIDTH_PX) / LABEL_HEIGHT_PX, LABEL_WORLD_HEIGHT, 1);
  let current = "";

  return {
    sprite,
    setText(text) {
      if (text === current) return;
      current = text;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "600 44px 'Segoe UI', Roboto, system-ui, sans-serif";
      const width = Math.min(canvas.width - 8, ctx.measureText(text).width + 48);
      const left = (canvas.width - width) / 2;
      ctx.fillStyle = "rgba(34, 26, 18, 0.62)";
      ctx.beginPath();
      ctx.roundRect(left, 12, width, canvas.height - 24, 36);
      ctx.fill();
      ctx.fillStyle = "#f4ead8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2, canvas.width - 40);
      texture.needsUpdate = true;
    },
  };
}
