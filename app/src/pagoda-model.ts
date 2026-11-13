// The Shwedagon-style gold pagoda seen far beyond the temple wall. The whole
// complex is one meshopt-compressed mesh with a few material slots (built by
// scripts/blender/pagoda.py), so it costs a handful of draw calls.
import type { Material, Object3D } from "three";
import { Mesh, PointLight } from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { PAGODA_LAMPS } from "./pagoda-layout";
import { PAGODA } from "./temple-layout";

export const PAGODA_MODEL_URL = "/models/pagoda.glb";

// `instanceof Mesh` alone narrows to Mesh<any, any>.
function isMesh(node: Object3D): node is Mesh {
  return node instanceof Mesh;
}

function materialsOf(mesh: Mesh): Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

// A few warm lamps inside the hall, as in the temple's own buildings: short reach and
// decay 2, so each lights the room round it and not the plaza outside.
const HALL_LAMP_COLOR = 0xff_c4_69;
const HALL_LAMP_REACH = 22;
const HALL_LAMP_INTENSITY = 0.5 * HALL_LAMP_REACH * HALL_LAMP_REACH;

function addHallLamps(model: Object3D): void {
  for (const { bx, by, height, strength } of PAGODA_LAMPS) {
    const lamp = new PointLight(HALL_LAMP_COLOR, HALL_LAMP_INTENSITY * strength, HALL_LAMP_REACH, 2);
    lamp.position.set(bx, height, -by); // model metres: glTF is y-up, with z = -by
    lamp.castShadow = false;
    model.add(lamp);
  }
}

export function placePagoda(model: Object3D): void {
  model.position.set(PAGODA.x, PAGODA.groundY, PAGODA.z);
  model.rotation.set(0, PAGODA.rotationY, 0);
  model.scale.setScalar(PAGODA.scale);
  addHallLamps(model);
  model.traverse((node) => {
    if (!isMesh(node)) return;
    // The scene's fog (90–340 units) would bury a landmark this far away.
    for (const material of materialsOf(node)) {
      if ("fog" in material) material.fog = false;
    }
  });
}

// A missing or broken file is not an error: warn once and show no pagoda.
export async function loadPagoda(loader: GLTFLoader): Promise<Object3D | null> {
  try {
    const gltf = await loader.loadAsync(PAGODA_MODEL_URL);
    placePagoda(gltf.scene);
    return gltf.scene;
  } catch (error: unknown) {
    console.warn(`Could not load ${PAGODA_MODEL_URL}; the temple has no distant pagoda.`, error);
    return null;
  }
}
