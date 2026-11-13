// The temple's red paper lanterns. The shape comes from lantern.glb (built in
// Blender by scripts/blender/lantern.py); the materials stay in
// temple-grounds.ts, so the glow at night keeps working. Each part is drawn
// as one InstancedMesh, so all the lanterns together cost three draw calls.
import type { BufferGeometry, Material, Object3D } from "three";
import { CylinderGeometry, Group, InstancedMesh, Mesh, SphereGeometry } from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const LANTERN_MODEL_URL = "/models/lantern.glb";

// The model is built with a body radius of 0.5; the old procedural lanterns
// had 0.28, so this keeps them about the same size.
export const LANTERN_SCALE = 0.6;

const PART_NAMES = { paper: "lantern_paper", gold: "lantern_gold", hanging: "lantern_hanging" } as const;
const PART_NAME_SET: ReadonlySet<string> = new Set(Object.values(PART_NAMES));

export interface LanternGeometries {
  paper: BufferGeometry;
  gold: BufferGeometry;
  // Cord and tassel, drawn only for lanterns that hang. Null: nothing hangs.
  hanging: BufferGeometry | null;
}

export interface LanternSpot {
  x: number;
  y: number;
  z: number;
}

export interface LanternSpots {
  // Sit on a post: no cord or tassel.
  standing: LanternSpot[];
  // Hang from above: cord and tassel too.
  hanging: LanternSpot[];
}

// `instanceof Mesh` alone narrows to Mesh<any, any>.
function isMesh(node: Object3D): node is Mesh {
  return node instanceof Mesh;
}

// null when the model lacks one of the parts the code relies on.
export function extractLanternGeometries(root: Object3D): LanternGeometries | null {
  root.updateMatrixWorld(true);
  const found = new Map<string, BufferGeometry>();
  root.traverse((node) => {
    if (isMesh(node) && PART_NAME_SET.has(node.name)) {
      found.set(
        node.name,
        node.geometry.clone().applyMatrix4(node.matrixWorld).scale(LANTERN_SCALE, LANTERN_SCALE, LANTERN_SCALE),
      );
    }
  });
  const paper = found.get(PART_NAMES.paper);
  const gold = found.get(PART_NAMES.gold);
  const hanging = found.get(PART_NAMES.hanging);
  return paper && gold && hanging ? { paper, gold, hanging } : null;
}

// The look before the model existed: a paper ball with a cap at each end.
export function fallbackLanternGeometries(): LanternGeometries {
  const paper = new SphereGeometry(0.28, 16, 12).scale(1, 1.25, 1);
  const top = new CylinderGeometry(0.13, 0.13, 0.07, 12).translate(0, 0.37, 0);
  const bottom = new CylinderGeometry(0.13, 0.13, 0.07, 12).translate(0, -0.37, 0);
  return { paper, gold: mergeGeometries([top, bottom]), hanging: null };
}

// A missing or broken model is not an error: warn once and keep the old look.
export async function loadLanternGeometries(loader: GLTFLoader): Promise<LanternGeometries> {
  try {
    const gltf = await loader.loadAsync(LANTERN_MODEL_URL);
    const geometries = extractLanternGeometries(gltf.scene);
    if (geometries) return geometries;
    console.warn(`${LANTERN_MODEL_URL} lacks the lantern parts; using the plain lantern.`);
  } catch (error: unknown) {
    console.warn(`Could not load ${LANTERN_MODEL_URL}; using the plain lantern.`, error);
  }
  return fallbackLanternGeometries();
}

function instancedAt(name: string, geometry: BufferGeometry, material: Material, spots: LanternSpot[]): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, spots.length);
  mesh.name = name;
  for (const [index, spot] of spots.entries()) {
    mesh.setMatrixAt(index, mesh.matrix.clone().setPosition(spot.x, spot.y, spot.z));
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// The tassel and cord use the paper material, so they glow with it at night.
export function buildLanternMeshes(
  geometries: LanternGeometries,
  materials: { paper: Material; gold: Material },
  spots: LanternSpots,
): Group {
  const group = new Group();
  const all = [...spots.standing, ...spots.hanging];
  group.add(
    instancedAt("lantern-paper", geometries.paper, materials.paper, all),
    instancedAt("lantern-gold", geometries.gold, materials.gold, all),
  );
  if (geometries.hanging) {
    group.add(instancedAt("lantern-hanging", geometries.hanging, materials.paper, spots.hanging));
  }
  return group;
}
