// The visitor avatar is monk-nam-tong.glb (built by scripts/blender/nam_tong.py
// from the original monk.glb: same rig, new Nam tông robe). If that file is
// missing the original monk.glb is used, so the temple never opens without a body.
import type { Object3D } from "three";

export const NAM_TONG_MONK_URL = "/models/monk-nam-tong.glb";

export async function loadMonkOrFallback(
  loadNamTong: () => Promise<Object3D>,
  loadOriginal: () => Promise<Object3D>,
): Promise<Object3D> {
  try {
    return await loadNamTong();
  } catch (error: unknown) {
    console.warn(`Could not load ${NAM_TONG_MONK_URL}; using the original monk.`, error);
    return loadOriginal();
  }
}
