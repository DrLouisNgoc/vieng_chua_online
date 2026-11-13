import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { placeStatueCopy } from "./statue-copy";

// A lopsided, already-placed stand-in for the temple's Buddha: 2 wide, 6 tall,
// 1 deep, scaled and moved the way scene.ts leaves it.
function placedStatue(): Group {
  const root = new Group();
  const body = new Mesh(new BoxGeometry(2, 6, 1), new MeshStandardMaterial());
  body.position.set(1, 3, 0);
  root.add(body);
  root.scale.setScalar(2);
  root.position.set(40, 10, -50);
  root.rotation.y = -Math.PI / 2;
  return root;
}

describe("placeStatueCopy", () => {
  const spot = { x: 150, z: -85, baseY: 1.5, height: 3.8, rotationY: Math.PI };

  it("stands the copy on its spot at the wanted height, whatever size the original was", () => {
    const copy = placeStatueCopy(placedStatue(), spot);
    const box = new Box3().setFromObject(copy);
    expect(box.min.y).toBeCloseTo(spot.baseY);
    expect(box.getSize(new Vector3()).y).toBeCloseTo(spot.height);
    const centre = box.getCenter(new Vector3());
    expect(centre.x).toBeCloseTo(spot.x);
    expect(centre.z).toBeCloseTo(spot.z);
  });

  it("leaves the original where it was, and shares its geometry instead of copying it", () => {
    const original = placedStatue();
    const copy = placeStatueCopy(original, spot);
    expect(original.position.toArray()).toEqual([40, 10, -50]);
    expect(original.scale.x).toBe(2);
    const sourceMesh = original.children.at(0) as Mesh;
    const copiedMesh = copy.children.at(0) as Mesh;
    expect(copiedMesh.geometry).toBe(sourceMesh.geometry);
  });

  it("turns it to face the way asked", () => {
    expect(placeStatueCopy(placedStatue(), spot).rotation.y).toBeCloseTo(Math.PI);
  });
});
