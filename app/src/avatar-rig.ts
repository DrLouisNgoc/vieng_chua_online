import type { Object3D } from "three";
import { Euler, Quaternion } from "three";

import type { BodyPose, BoneName, BoneRotation } from "./body-pose";
import { BONE_NAMES } from "./body-pose";

// Poses one monk.glb instance (the visitor's own avatar or another
// visitor's). Create it before the avatar is posed: rest rotations are
// read at creation.

export interface AvatarRig {
  bone: (name: BoneName) => Object3D | undefined;
  applyPose: (pose: BodyPose) => void;
}

const avatarWorldQuat = new Quaternion();
const avatarToParent = new Quaternion();
const parentToAvatar = new Quaternion();
const offset = new Quaternion();
const offsetEuler = new Euler(0, 0, 0, "YXZ");

export function createAvatarRig(avatar: Object3D): AvatarRig {
  // GLTFLoader strips "." from node names (it reserves "." as the
  // animation-track path separator), so the original rig's "thigh.L" etc.
  // load as "thighL".
  const bones = new Map<BoneName, Object3D>();
  const restQuaternions = new Map<Object3D, Quaternion>();
  const found = BONE_NAMES.map((name) => ({ name, bone: avatar.getObjectByName(name) })).filter(
    (entry): entry is { name: BoneName; bone: Object3D } => entry.bone !== undefined,
  );
  for (const { name, bone } of found) {
    bones.set(name, bone);
    restQuaternions.set(bone, bone.quaternion.clone());
  }

  // Rotate a bone about the avatar's own axes, as an offset from its rest
  // pose. Converting the rotation into the bone's parent frame makes this
  // independent of how each bone's local axes were rolled in the rig.
  function rotateBone(bone: Object3D, rotation: BoneRotation): void {
    const rest = restQuaternions.get(bone);
    if (!rest || !bone.parent) return;
    avatar.getWorldQuaternion(avatarWorldQuat);
    bone.parent.getWorldQuaternion(avatarToParent);
    avatarToParent.invert().multiply(avatarWorldQuat);
    parentToAvatar.copy(avatarToParent).invert();
    offsetEuler.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
    offset.setFromEuler(offsetEuler).premultiply(avatarToParent).multiply(parentToAvatar);
    bone.quaternion.copy(rest).premultiply(offset);
    bone.updateMatrixWorld(true);
  }

  return {
    bone: (name) => bones.get(name),
    // Parents first (BONE_NAMES order), so each child uses its parent's new
    // pose; bones the pose leaves out go back to rest.
    applyPose(pose) {
      avatar.updateMatrixWorld(true);
      for (const name of BONE_NAMES) {
        const bone = bones.get(name);
        if (bone) rotateBone(bone, pose.bones[name] ?? {});
      }
    },
  };
}
