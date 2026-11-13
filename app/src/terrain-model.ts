// The mountains and the river all round the walkable land, built in Blender by
// scripts/blender/terrain.py (owner, 2026-11-13: "xây núi xây sông hùng vĩ", "ko để đất
// trống tí nào"). Two meshes with vertex colours, in world coordinates, so the model is
// added to the scene as it is. Its fog is off, so the far ranges stay in view above the
// haze of the ground; a missing file is not an error: the horizon is just the ground.
import type { Material, Object3D } from "three";
import { Mesh } from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const TERRAIN_URL = "/models/terrain.glb";

// `instanceof Mesh` alone narrows to Mesh<any, any>.
function isMesh(node: Object3D): node is Mesh {
  return node instanceof Mesh;
}

function materialsOf(mesh: Mesh): Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

export function placeTerrain(model: Object3D): Object3D {
  const meshes: Mesh[] = [];
  model.traverse((node) => {
    if (isMesh(node)) meshes.push(node);
  });
  for (const mesh of meshes) {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    for (const material of materialsOf(mesh)) {
      if ("fog" in material) material.fog = false;
    }
  }
  return model;
}

export async function loadTerrain(loader: GLTFLoader): Promise<Object3D | null> {
  try {
    const gltf = await loader.loadAsync(TERRAIN_URL);
    gltf.scene.name = "terrain";
    return placeTerrain(gltf.scene);
  } catch (error: unknown) {
    console.warn(`Could not load ${TERRAIN_URL}; the land has no mountains.`, error);
    return null;
  }
}
