// The 8 cốc in the Myanmar style of the pagoda (owner, 2026-11-13: "các cốc kia
// bạn làm lại theo phong cách đó"): the hut's shape is coc.glb (built in Blender
// by scripts/blender/coc.py); the nameplate and the small lamp are added here, so
// the board's title can still change (setPlaqueText) and the room still reads lit.
import type { Object3D, Texture } from "three";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// `instanceof Mesh` alone narrows to Mesh<any, any>.
function isMesh(node: Object3D): node is Mesh {
  return node instanceof Mesh;
}

export const COC_MODEL_URL = "/models/coc.glb";

// The footprint coc.glb was built for (and the size of every cốc in temple-layout.ts).
export const COC_MODEL_SIZE = 2.4;

// In the model's own metres: above the door's gold lintel, under the gold band
// at the top of the wall, and a little off the east face (x = half), which the
// door frame also stands proud of.
const PLAQUE_HEIGHT = 0.42;
const PLAQUE_Y = 2.1;
const PLAQUE_STAND_OFF = 0.14;
const LAMP_Y = 2;

interface MyanmarCocOptions {
  template: Object3D;
  size: number;
  title: string;
  makePlaqueTexture: (text: string) => Texture;
  lampColor: number;
}

export function buildMyanmarCoc(options: MyanmarCocOptions): { group: Group; setPlaqueText: (text: string) => void } {
  const { template, size, title, makePlaqueTexture, lampColor } = options;
  const scale = size / COC_MODEL_SIZE;
  const half = size / 2;
  const group = new Group();

  const body = template.clone(true);
  body.scale.setScalar(scale);
  body.name = "model";
  const meshes: Mesh[] = [];
  body.traverse((node) => {
    if (isMesh(node)) meshes.push(node);
  });
  for (const mesh of meshes) {
    // The sun's shadow map spans the whole yard, so a roof's shadow on a hut this
    // small is low-resolution and reads as solid black: shadows land on it, not from it.
    mesh.castShadow = false;
    mesh.receiveShadow = true;
  }
  group.add(body);

  const plaqueMaterial = new MeshStandardMaterial({ map: makePlaqueTexture(title), roughness: 0.6 });
  const plaque = new Mesh(new BoxGeometry(size * 0.85, PLAQUE_HEIGHT * scale, 0.06), plaqueMaterial);
  plaque.name = "plaque";
  plaque.position.set(half + PLAQUE_STAND_OFF * scale, PLAQUE_Y * scale, 0);
  plaque.rotation.y = Math.PI / 2;
  plaque.castShadow = false;
  group.add(plaque);

  // Short reach and decay 2: it lights this one small room, not the whole yard.
  const lampReach = size * 1.3;
  const lamp = new PointLight(lampColor, 3 * lampReach * lampReach, lampReach, 2);
  lamp.position.set(0, LAMP_Y * scale, 0);
  lamp.castShadow = false;
  group.add(lamp);

  return {
    group,
    setPlaqueText(text) {
      plaqueMaterial.map = makePlaqueTexture(text);
      plaqueMaterial.needsUpdate = true;
    },
  };
}

// A missing or broken file is not an error: warn once and let the caller build the old hut.
export async function loadCocTemplate(loader: GLTFLoader): Promise<Object3D | null> {
  try {
    const gltf = await loader.loadAsync(COC_MODEL_URL);
    return gltf.scene;
  } catch (error: unknown) {
    console.warn(`Could not load ${COC_MODEL_URL}; the cốc keep their wooden look.`, error);
    return null;
  }
}
