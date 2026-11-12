import type { Object3D, Scene, Vector3 } from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

import type { NameLabel } from "./avatar-look";
import { createNameLabel, labelText, tintRobe } from "./avatar-look";
import type { AvatarRig } from "./avatar-rig";
import { createAvatarRig } from "./avatar-rig";
import type { HeldProps } from "./held-props";
import { createHeldProps, placeHeldProps, removeHeldProps } from "./held-props";
import { poseForActivity } from "./pose-for-activity";
import { approach, approachAngle, smoothingFactor } from "./remote-motion";
import { groundHeightAt } from "./temple-layout";
import type { VisitorView } from "./visitor-protocol";

// Other visitors' avatars (Milestone 6): one tinted monk clone per visitor,
// following the server's 10 Hz states smoothly and posed with the same
// code as the visitor's own avatar.

export interface RemoteVisitorsOptions {
  scene: Scene;
  // An unposed copy of monk.glb, taken before the own avatar was posed.
  template: Object3D;
  // The avatar's y when standing on ground height 0.
  groundY: number;
  robeColors: readonly { base: string }[];
}

export interface RemoteVisitors {
  sync: (visitors: readonly VisitorView[]) => void;
  update: (deltaSeconds: number, cameraPosition: Vector3) => void;
  occupiedSeats: () => ReadonlySet<number>;
}

interface Remote {
  view: VisitorView;
  avatar: Object3D;
  rig: AvatarRig;
  label: NameLabel;
  props: HeldProps;
  x: number;
  z: number;
  heading: number;
  walkSeconds: number;
  activitySeconds: number;
}

const LABEL_HEIGHT = 2.05;
const LABEL_MAX_DISTANCE = 40;

interface Frame {
  factor: number;
  cameraPosition: Vector3;
  groundY: number;
}

function createRemote(scene: Scene, template: Object3D, view: VisitorView, robe: string): Remote {
  const avatar = cloneSkinned(template);
  avatar.visible = true;
  tintRobe(avatar, robe);
  scene.add(avatar);
  const label = createNameLabel();
  scene.add(label.sprite);
  return {
    view,
    avatar,
    rig: createAvatarRig(avatar),
    label,
    props: createHeldProps(scene),
    x: view.x,
    z: view.z,
    heading: view.heading,
    walkSeconds: 0,
    activitySeconds: 0,
  };
}

// Poses and places the avatar, its held props and its label at the
// remote's current (already smoothed) position.
function placeRemote(remote: Readonly<Remote>, frame: Frame): void {
  const { factor, cameraPosition } = frame;
  const { view, avatar, props } = remote;
  const pose = poseForActivity(view, remote.activitySeconds, remote.walkSeconds);
  const floorY = frame.groundY + groundHeightAt({ x: remote.x, z: remote.z }) - pose.hipsDrop;
  avatar.position.set(remote.x, approach(avatar.position.y, floorY, factor), remote.z);
  // +PI: monk.glb's modelled front faces the opposite of the heading convention
  avatar.rotation.y = remote.heading + Math.PI;
  remote.rig.applyPose(pose);
  placeHeldProps(remote.props, avatar, remote.rig, {
    holdingBroom: view.holdingBroom,
    beadsVisible: view.beadsVisible,
    walking: view.activity === "walking",
    walkSeconds: remote.walkSeconds,
  });
  props.broom.visible = view.holdingBroom;

  const { sprite } = remote.label;
  sprite.position.set(remote.x, avatar.position.y + LABEL_HEIGHT - pose.hipsDrop * 0.3, remote.z);
  sprite.visible = sprite.position.distanceTo(cameraPosition) < LABEL_MAX_DISTANCE;
  remote.label.setText(labelText(view.name, view.beadsVisible, view.beadTotal));
}

export function createRemoteVisitors(options: RemoteVisitorsOptions): RemoteVisitors {
  const { scene, template } = options;
  // Typed as possibly missing: a visitor's colorIndex can be out of range.
  const robeColors: readonly ({ base: string } | undefined)[] = options.robeColors;
  const remotes = new Map<string, Remote>();
  let occupied: ReadonlySet<number> = new Set();

  function robeColor(index: number): string {
    return robeColors[index]?.base ?? robeColors[0]?.base ?? "#3f6e9c";
  }

  function add(view: VisitorView): Remote {
    const remote = createRemote(scene, template, view, robeColor(view.colorIndex));
    remotes.set(view.id, remote);
    return remote;
  }

  function remove(remote: Remote): void {
    scene.remove(remote.avatar, remote.label.sprite);
    removeHeldProps(scene, remote.props);
    remote.label.sprite.material.map?.dispose();
    remote.label.sprite.material.dispose();
    remotes.delete(remote.view.id);
  }

  return {
    sync(visitors) {
      const seen = new Set<string>();
      for (const view of visitors) {
        seen.add(view.id);
        const remote = remotes.get(view.id) ?? add(view);
        if (remote.view.activity !== view.activity) remote.activitySeconds = 0;
        if (remote.view.colorIndex !== view.colorIndex) tintRobe(remote.avatar, robeColor(view.colorIndex));
        remote.view = view;
      }
      // Deleting the entry being visited is safe while iterating a Map.
      for (const remote of remotes.values()) {
        if (!seen.has(remote.view.id)) remove(remote);
      }
      occupied = new Set(visitors.map((view) => view.seatIndex).filter((seat): seat is number => seat !== null));
    },
    update(deltaSeconds, cameraPosition) {
      const factor = smoothingFactor(deltaSeconds);
      const frame = { factor, cameraPosition, groundY: options.groundY };
      for (const remote of remotes.values()) {
        const { view } = remote;
        remote.x = approach(remote.x, view.x, factor);
        remote.z = approach(remote.z, view.z, factor);
        remote.heading = approachAngle(remote.heading, view.heading, factor);
        remote.activitySeconds += deltaSeconds;
        remote.walkSeconds = view.activity === "walking" ? remote.walkSeconds + deltaSeconds : 0;
        placeRemote(remote, frame);
      }
    },
    occupiedSeats: () => occupied,
  };
}
