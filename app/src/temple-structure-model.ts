// The temple's own structure in the Myanmar style, built in Blender by
// scripts/blender/temple.py (owner, 2026-11-13: "tường cột vách cũng blender
// lại cho chuẩn đi"): the main hall's three walls and all its pillars, and the
// perimeter wall. Both are built in the app's world coordinates, so they are
// added to the scene as they are. A missing file is not an error: the old
// procedural walls are built instead.
import type { Object3D } from "three";
import { Mesh } from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const HALL_BODY_URL = "/models/hall-body.glb";
export const PERIMETER_WALL_URL = "/models/perimeter-wall.glb";

// `instanceof Mesh` alone narrows to Mesh<any, any>.
function isMesh(node: Object3D): node is Mesh {
  return node instanceof Mesh;
}

export function placeStructure(model: Object3D): Object3D {
  const meshes: Mesh[] = [];
  model.traverse((node) => {
    if (isMesh(node)) meshes.push(node);
  });
  for (const mesh of meshes) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  return model;
}

async function loadStructure(
  loader: GLTFLoader,
  url: string,
  name: string,
  fallback: string,
): Promise<Object3D | null> {
  try {
    const gltf = await loader.loadAsync(url);
    gltf.scene.name = name;
    return placeStructure(gltf.scene);
  } catch (error: unknown) {
    console.warn(`Could not load ${url}; ${fallback}`, error);
    return null;
  }
}

export async function loadHallBody(loader: GLTFLoader): Promise<Object3D | null> {
  return loadStructure(loader, HALL_BODY_URL, "hall-body", "the hall keeps its old walls and pillars.");
}

export async function loadPerimeterWall(loader: GLTFLoader): Promise<Object3D | null> {
  return loadStructure(loader, PERIMETER_WALL_URL, "perimeter-wall", "the wall keeps its old look.");
}
