import { Group, Vector3, type Object3D, type Scene } from "three";
import { blendPose, SWEEP_FREQUENCY, type BodyPose } from "./body-pose";
import {
  BEAD_TOTAL_KEY,
  createBeadCounter,
  createStorageBeadStore,
} from "./bead-counter";
import { createInteractionState } from "./interaction-state";
import { findTargets, seatHeading, type Targets } from "./interaction-targets";
import {
  beadCounterText,
  promptsFor,
  type InteractionAction,
  type InteractionKey,
  type Prompt,
} from "./interaction-prompts";
import {
  createBeadString,
  createBroom,
  createLeafMesh,
  placeBroomBetween,
  syncLeafMesh,
  turnBeadString,
} from "./interaction-props";
import { createLeafField } from "./leaf-field";
import type { MovementController } from "./movement";
import { poseForActivity } from "./pose-for-activity";
import {
  BROOM_SPOT,
  LEAF_SOURCES,
  MEDITATION_SEATS,
  STATUE_ZONE,
  groundHeightAt,
} from "./temple-layout";

// Ties the pure interaction modules to the 3D scene: input -> state,
// state -> pose and props, state -> HUD view. scene.ts calls it once per
// frame and forwards keys.

export interface InteractionView {
  prompts: Prompt[];
  beadText: string | null;
}

export interface InteractionRuntimeDeps {
  scene: Scene;
  avatar: Object3D;
  movement: MovementController;
  handL: Object3D | undefined;
  handR: Object3D | undefined;
  setHeading: (heading: number) => void;
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  onView?: (view: InteractionView) => void;
}

export interface InteractionRuntime {
  perform: (action: InteractionAction) => void;
  // Returns true when the key was an interaction key with an offered action.
  handleKey: (code: string) => boolean;
  startMoving: () => void;
  stopMoving: () => void;
  // Before the pose is applied: advance state and return the pose to show.
  update: (deltaSeconds: number, walkSeconds: number) => BodyPose;
  // After the pose is applied: place the broom and beads at the hands.
  placeProps: (walkSeconds: number) => void;
}

const KEY_CODES: Record<string, InteractionKey> = { KeyE: "E", KeyQ: "Q", KeyB: "B" };
const POSE_BLEND_SECONDS = 0.25;
const SWEEP_RADIUS = 1.0;
const BROOM_REACH_AHEAD = 0.75;
const BROOM_SWING_WIDTH = 0.35;
const LEAF_CAP = 160;
const LEAF_INITIAL = 90;

const noStorage = { getItem: () => null, setItem: () => {} };

export function createInteractionRuntime(deps: InteractionRuntimeDeps): InteractionRuntime {
  const { scene, avatar, movement } = deps;
  const state = createInteractionState();
  const beads = createBeadCounter(createStorageBeadStore(deps.storage ?? noStorage, BEAD_TOTAL_KEY));
  const leafField = createLeafField({ sources: LEAF_SOURCES, cap: LEAF_CAP, initial: LEAF_INITIAL });
  const targetLayout = { seats: MEDITATION_SEATS, broomSpot: BROOM_SPOT, statueZone: STATUE_ZONE };

  const broom = createBroom();
  const leafMesh = createLeafMesh(LEAF_CAP);
  const beadHolder = new Group();
  const beadString = createBeadString();
  beadHolder.add(beadString);
  scene.add(broom, leafMesh, beadHolder);
  syncLeafMesh(leafMesh, leafField.leaves, groundHeightAt);
  standBroomAtSpot();

  let targets: Targets = findTargets(movement.position, targetLayout);
  let prompts: Prompt[] = [];
  let lastViewKey = "";
  let poseKey = "";
  let blendFrom: BodyPose = { bones: {}, hipsDrop: 0 };
  let blendSeconds = POSE_BLEND_SECONDS;
  let shownPose: BodyPose = blendFrom;

  function standBroomAtSpot(): void {
    broom.position.set(BROOM_SPOT.x, groundHeightAt(BROOM_SPOT), BROOM_SPOT.z);
    broom.quaternion.identity();
    broom.rotation.z = 0.12;
    broom.scale.set(1, 1, 1);
  }

  function publishView(): void {
    prompts = promptsFor(state.snapshot, targets);
    const view: InteractionView = {
      prompts,
      beadText: state.snapshot.beadsVisible ? beadCounterText(beads.round, beads.total) : null,
    };
    const key = JSON.stringify(view);
    if (key === lastViewKey) return;
    lastViewKey = key;
    deps.onView?.(view);
  }

  function perform(action: InteractionAction): void {
    // Only what the HUD currently offers, so keys and buttons share the rules.
    if (!prompts.some((prompt) => prompt.action === action)) return;
    switch (action) {
      case "sit": {
        const index = targets.seatIndex;
        const seat = index === null ? undefined : MEDITATION_SEATS[index];
        if (index === null || !seat || !state.sit(index)) return;
        movement.placeAt(seat);
        deps.setHeading(seatHeading(seat));
        break;
      }
      case "bow":
        state.bow(targets.inStatueZone);
        break;
      case "takeBroom":
      case "leaveBroom":
        if (state.toggleBroom() && !state.snapshot.holdingBroom) standBroomAtSpot();
        break;
      case "greet":
        state.greet();
        break;
      case "bead":
        if (state.turnBead()) {
          beads.turn();
          turnBeadString(beadString);
        }
        break;
    }
    publishView();
  }

  const handLPos = new Vector3();
  const handRPos = new Vector3();
  const foot = new Vector3();

  return {
    perform,
    handleKey(code) {
      const key = KEY_CODES[code];
      const prompt = key ? prompts.find((candidate) => candidate.key === key) : undefined;
      if (!prompt) return false;
      perform(prompt.action);
      return true;
    },
    startMoving() {
      if (state.snapshot.activity !== "walking") state.startMoving();
    },
    stopMoving() {
      state.stopMoving();
    },
    update(deltaSeconds, walkSeconds) {
      state.tick(deltaSeconds);
      const snapshot = state.snapshot;
      targets = findTargets(movement.position, targetLayout);

      const changed = leafField.update(deltaSeconds);
      const swept =
        snapshot.holdingBroom && snapshot.activity === "walking"
          ? leafField.sweep(movement.position, SWEEP_RADIUS)
          : 0;
      if (changed || swept > 0) syncLeafMesh(leafMesh, leafField.leaves, groundHeightAt);
      publishView();

      // Blend over a short time whenever the kind of pose changes.
      const nextKey = `${snapshot.activity}|${snapshot.seatIndex !== null}|${snapshot.holdingBroom}`;
      if (nextKey !== poseKey) {
        poseKey = nextKey;
        blendFrom = shownPose;
        blendSeconds = 0;
      }
      blendSeconds += deltaSeconds;
      const target = poseForActivity(snapshot, state.activitySeconds, walkSeconds);
      shownPose =
        blendSeconds < POSE_BLEND_SECONDS
          ? blendPose(blendFrom, target, blendSeconds / POSE_BLEND_SECONDS)
          : target;
      return shownPose;
    },
    placeProps(walkSeconds) {
      const snapshot = state.snapshot;
      beadHolder.visible = snapshot.beadsVisible && !!deps.handL && !!deps.handR;
      beadString.visible = beadHolder.visible;
      if (beadHolder.visible && deps.handL && deps.handR) {
        deps.handL.getWorldPosition(handLPos);
        deps.handR.getWorldPosition(handRPos);
        beadHolder.position.addVectors(handLPos, handRPos).multiplyScalar(0.5);
        beadHolder.rotation.set(0, avatar.rotation.y, 0);
      }

      if (snapshot.holdingBroom && deps.handR) {
        // avatar.rotation.y is heading + PI; the walk heading is the opposite
        const heading = avatar.rotation.y - Math.PI;
        const swing =
          snapshot.activity === "walking"
            ? Math.sin(walkSeconds * SWEEP_FREQUENCY) * BROOM_SWING_WIDTH
            : 0;
        const forwardX = Math.sin(heading);
        const forwardZ = Math.cos(heading);
        foot.set(
          avatar.position.x + forwardX * BROOM_REACH_AHEAD + forwardZ * swing,
          0,
          avatar.position.z + forwardZ * BROOM_REACH_AHEAD - forwardX * swing,
        );
        foot.y = groundHeightAt({ x: foot.x, z: foot.z });
        deps.handR.getWorldPosition(handRPos);
        placeBroomBetween(broom, foot, handRPos);
      }
    },
  };
}
