// A second copy of the temple's Buddha statue (the owner's own Tripo model) for
// the pagoda complex's hall (owner, 2026-11-13: "tạo tượng đẹp như tôi tạo vào").
// clone() shares the geometry and materials, so it costs no extra memory.
import type { Object3D } from "three";
import { Box3, Vector3 } from "three";

export interface StatueSpot {
  x: number;
  z: number;
  // The height of the statue's base, and how tall it stands.
  baseY: number;
  height: number;
  // Turn about the vertical axis. buddha.glb faces +x as it comes.
  rotationY: number;
}

export function placeStatueCopy(source: Object3D, spot: StatueSpot): Object3D {
  const copy = source.clone(true);
  copy.position.set(0, 0, 0);
  copy.rotation.set(0, spot.rotationY, 0);
  copy.scale.setScalar(1);
  copy.updateMatrixWorld(true);
  const size = new Box3().setFromObject(copy).getSize(new Vector3());
  copy.scale.setScalar(size.y > 0 ? spot.height / size.y : 1);
  copy.updateMatrixWorld(true);
  const box = new Box3().setFromObject(copy);
  const centre = box.getCenter(new Vector3());
  copy.position.set(spot.x - centre.x, spot.baseY - box.min.y, spot.z - centre.z);
  copy.updateMatrixWorld(true);
  return copy;
}
