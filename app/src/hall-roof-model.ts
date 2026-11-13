// The main hall's roof in the Myanmar style of the pagoda (owner, 2026-11-13:
// "đổi chùa luôn đi"): three teal hip roofs on gold-banded drums under a gold
// spire, built in Blender by scripts/blender/hall.py. Only the roof is a model;
// the floor, walls, pillars, altar and Buddha stay as they were.
import type { Object3D } from "three";
import { Mesh } from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const HALL_ROOF_URL = "/models/hall-roof.glb";

// `instanceof Mesh` alone narrows to Mesh<any, any>.
function isMesh(node: Object3D): node is Mesh {
  return node instanceof Mesh;
}

// The model is centred on the hall, with its lowest eave at its own y = 0.
export function placeHallRoof(model: Object3D, spot: { x: number; y: number; z: number }): Object3D {
  model.position.set(spot.x, spot.y, spot.z);
  const meshes: Mesh[] = [];
  model.traverse((node) => {
    if (isMesh(node)) meshes.push(node);
  });
  for (const mesh of meshes) {
    mesh.castShadow = true;
    mesh.receiveShadow = false;
  }
  return model;
}

// A missing or broken file is not an error: warn once and let the caller build the old roof.
export async function loadHallRoof(loader: GLTFLoader): Promise<Object3D | null> {
  try {
    const gltf = await loader.loadAsync(HALL_ROOF_URL);
    gltf.scene.name = "hall-roof";
    return gltf.scene;
  } catch (error: unknown) {
    console.warn(`Could not load ${HALL_ROOF_URL}; the hall keeps its old roof.`, error);
    return null;
  }
}
