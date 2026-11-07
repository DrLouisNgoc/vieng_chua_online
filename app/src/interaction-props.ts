import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import type { Leaf } from "./leaf-field";
import type { Point } from "./movement";

// Meshes for the Milestone 5 props: the broom, fallen leaves and the bead
// string. Kept out of scene.ts, which only positions them each frame.

const BROOM_LENGTH = 1.5;
const BROOM_HEAD_LENGTH = 0.45;
// Yellow, olive and dark brown: contrast with the terracotta paving.
const LEAF_COLORS = [0xe8c547, 0x8f9a35, 0x4f3420, 0xd9b84a, 0x6b7a2a];
const BEAD_COUNT = 27;
const BEAD_RING_RADIUS = 0.11;

// Origin at the bristle tips; the handle points up +Y.
export function createBroom(): Group {
  const broom = new Group();
  const handle = new Mesh(
    new CylinderGeometry(0.022, 0.022, BROOM_LENGTH - BROOM_HEAD_LENGTH * 0.5, 8),
    new MeshStandardMaterial({ color: 0x8a6440, roughness: 0.8 }),
  );
  handle.position.y = BROOM_HEAD_LENGTH * 0.5 + (BROOM_LENGTH - BROOM_HEAD_LENGTH * 0.5) / 2;
  const head = new Mesh(
    new CylinderGeometry(0.05, 0.17, BROOM_HEAD_LENGTH, 10),
    new MeshStandardMaterial({ color: 0xc9a85a, roughness: 1 }),
  );
  head.position.y = BROOM_HEAD_LENGTH / 2;
  for (const part of [handle, head]) {
    part.castShadow = true;
    broom.add(part);
  }
  return broom;
}

const UP = new Vector3(0, 1, 0);
const along = new Vector3();
const tilt = new Quaternion();

// Stretch the broom from its tips at `foot` to the grip at `grip`.
export function placeBroomBetween(broom: Object3D, foot: Vector3, grip: Vector3): void {
  along.subVectors(grip, foot);
  const length = along.length();
  broom.position.copy(foot);
  tilt.setFromUnitVectors(UP, along.normalize());
  broom.quaternion.copy(tilt);
  broom.scale.set(1, length / BROOM_LENGTH, 1);
}

export function createLeafMesh(cap: number): InstancedMesh {
  const geometry = new PlaneGeometry(0.32, 0.2);
  geometry.rotateX(-Math.PI / 2);
  const material = new MeshStandardMaterial({ roughness: 0.9, side: DoubleSide });
  const mesh = new InstancedMesh(geometry, material, cap);
  const color = new Color();
  for (let i = 0; i < cap; i += 1) {
    mesh.setColorAt(i, color.setHex(LEAF_COLORS[i % LEAF_COLORS.length] ?? 0xc8862e));
  }
  mesh.count = 0;
  mesh.receiveShadow = true;
  // leaves move between instances; skip culling against a stale bounding sphere
  mesh.frustumCulled = false;
  return mesh;
}

const placement = new Object3D();

export function syncLeafMesh(
  mesh: InstancedMesh,
  leaves: readonly Leaf[],
  heightAt: (point: Point) => number,
): void {
  leaves.forEach((leaf, index) => {
    placement.position.set(leaf.x, heightAt(leaf) + 0.015, leaf.z);
    placement.rotation.set(0, leaf.rotation, 0);
    placement.updateMatrix();
    mesh.setMatrixAt(index, placement.matrix);
  });
  mesh.count = leaves.length;
  mesh.instanceMatrix.needsUpdate = true;
}

// A ring of beads lying in its own XY plane.
export function createBeadString(): InstancedMesh {
  const mesh = new InstancedMesh(
    new SphereGeometry(0.022, 8, 6),
    new MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.5 }),
    BEAD_COUNT,
  );
  for (let i = 0; i < BEAD_COUNT; i += 1) {
    const angle = (i / BEAD_COUNT) * Math.PI * 2;
    placement.position.set(Math.cos(angle) * BEAD_RING_RADIUS, Math.sin(angle) * BEAD_RING_RADIUS, 0);
    placement.rotation.set(0, 0, 0);
    placement.updateMatrix();
    mesh.setMatrixAt(i, placement.matrix);
  }
  mesh.visible = false;
  return mesh;
}

// Advance the ring by one bead, so each turn is visible.
export function turnBeadString(beads: Object3D): void {
  beads.rotation.z += (Math.PI * 2) / BEAD_COUNT;
}
