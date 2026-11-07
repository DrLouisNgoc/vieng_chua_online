import { Group, Vector3, type InstancedMesh, type Object3D, type Scene } from "three";
import { SWEEP_FREQUENCY } from "./body-pose";
import type { AvatarRig } from "./avatar-rig";
import { createBeadString, createBroom, placeBroomBetween } from "./interaction-props";
import { groundHeightAt } from "./temple-layout";

// The broom and bead string an avatar holds, placed at its hands each
// frame. Shared by the visitor's own avatar and other visitors' avatars.

export interface HeldProps {
  broom: Group;
  beadHolder: Group;
  beadString: InstancedMesh;
}

export interface HeldState {
  holdingBroom: boolean;
  beadsVisible: boolean;
  walking: boolean;
}

const BROOM_REACH_AHEAD = 0.75;
const BROOM_SWING_WIDTH = 0.35;

export function createHeldProps(scene: Scene): HeldProps {
  const broom = createBroom();
  const beadHolder = new Group();
  const beadString = createBeadString();
  beadHolder.add(beadString);
  scene.add(broom, beadHolder);
  return { broom, beadHolder, beadString };
}

export function removeHeldProps(scene: Scene, props: HeldProps): void {
  scene.remove(props.broom, props.beadHolder);
}

const handLPos = new Vector3();
const handRPos = new Vector3();
const foot = new Vector3();

// Call after the pose is applied. Only places the broom while it is held;
// the caller decides where a free broom goes.
export function placeHeldProps(
  props: HeldProps,
  avatar: Object3D,
  rig: AvatarRig,
  held: HeldState,
  walkSeconds: number,
): void {
  const handL = rig.bone("handL");
  const handR = rig.bone("handR");

  props.beadHolder.visible = held.beadsVisible && !!handL && !!handR;
  props.beadString.visible = props.beadHolder.visible;
  if (props.beadHolder.visible && handL && handR) {
    handL.getWorldPosition(handLPos);
    handR.getWorldPosition(handRPos);
    props.beadHolder.position.addVectors(handLPos, handRPos).multiplyScalar(0.5);
    props.beadHolder.rotation.set(0, avatar.rotation.y, 0);
  }

  if (held.holdingBroom && handR) {
    // avatar.rotation.y is heading + PI; the walk heading is the opposite
    const heading = avatar.rotation.y - Math.PI;
    const swing = held.walking ? Math.sin(walkSeconds * SWEEP_FREQUENCY) * BROOM_SWING_WIDTH : 0;
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);
    foot.set(
      avatar.position.x + forwardX * BROOM_REACH_AHEAD + forwardZ * swing,
      0,
      avatar.position.z + forwardZ * BROOM_REACH_AHEAD - forwardX * swing,
    );
    foot.y = groundHeightAt({ x: foot.x, z: foot.z });
    handR.getWorldPosition(handRPos);
    placeBroomBetween(props.broom, foot, handRPos);
  }
}
