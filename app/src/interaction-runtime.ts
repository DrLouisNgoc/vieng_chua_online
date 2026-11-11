import type { Object3D, Scene } from "three";
import { blendPose, type BodyPose } from "./body-pose";
import type { AvatarRig } from "./avatar-rig";
import { createHeldProps, placeHeldProps } from "./held-props";
import { BEAD_TOTAL_KEY, createBeadCounter, createStorageBeadStore } from "./bead-counter";
import { createInteractionState, type InteractionSnapshot } from "./interaction-state";
import { findTargets, seatHeading, type Targets } from "./interaction-targets";
import {
  beadCounterText,
  promptsFor,
  type InteractionAction,
  type InteractionKey,
  type Prompt,
} from "./interaction-prompts";
import { createLeafMesh, syncLeafMesh, turnBeadString } from "./interaction-props";
import { createLeafField } from "./leaf-field";
import type { MovementController } from "./movement";
import { poseForActivity } from "./pose-for-activity";
import { BELL_TOWER, BROOM_SPOT, LEAF_SOURCES, MEDITATION_SEATS, STATUE_ZONE, groundHeightAt } from "./temple-layout";

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
  rig: AvatarRig;
  // Cushions other visitors sit on (Milestone 6).
  occupiedSeats?: () => ReadonlySet<number>;
  setHeading: (heading: number) => void;
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  onView?: (view: InteractionView) => void;
  onRingBell?: () => void;
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
  // The server refused our cushion.
  standUp: () => void;
  startChanting: () => boolean;
  stopChanting: () => void;
  readonly snapshot: InteractionSnapshot;
  readonly beadTotal: number;
}

const KEY_CODES: Record<string, InteractionKey> = { KeyE: "E", KeyQ: "Q", KeyB: "B" };
const POSE_BLEND_SECONDS = 0.25;
const SWEEP_RADIUS = 1.0;
const LEAF_CAP = 160;
const LEAF_INITIAL = 90;

const noStorage = { getItem: () => null, setItem: () => {} };

export function createInteractionRuntime(deps: InteractionRuntimeDeps): InteractionRuntime {
  const { scene, avatar, movement } = deps;
  const state = createInteractionState();
  const beads = createBeadCounter(createStorageBeadStore(deps.storage ?? noStorage, BEAD_TOTAL_KEY));
  const leafField = createLeafField({ sources: LEAF_SOURCES, cap: LEAF_CAP, initial: LEAF_INITIAL });
  const targetLayout = {
    seats: MEDITATION_SEATS,
    broomSpot: BROOM_SPOT,
    statueZone: STATUE_ZONE,
    bell: BELL_TOWER,
  };

  const held = createHeldProps(scene);
  const { broom, beadString } = held;
  const leafMesh = createLeafMesh(LEAF_CAP);
  scene.add(leafMesh);
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
      case "ringBell":
        deps.onRingBell?.();
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
      targets = findTargets(movement.position, {
        ...targetLayout,
        occupied: deps.occupiedSeats?.(),
      });

      const changed = leafField.update(deltaSeconds);
      const swept =
        snapshot.holdingBroom && snapshot.activity === "walking" ? leafField.sweep(movement.position, SWEEP_RADIUS) : 0;
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
        blendSeconds < POSE_BLEND_SECONDS ? blendPose(blendFrom, target, blendSeconds / POSE_BLEND_SECONDS) : target;
      return shownPose;
    },
    placeProps(walkSeconds) {
      const snapshot = state.snapshot;
      placeHeldProps(
        held,
        avatar,
        deps.rig,
        {
          holdingBroom: snapshot.holdingBroom,
          beadsVisible: snapshot.beadsVisible,
          walking: snapshot.activity === "walking",
        },
        walkSeconds,
      );
    },
    standUp() {
      state.standUp();
      publishView();
    },
    startChanting() {
      const started = state.chant();
      publishView();
      return started;
    },
    stopChanting() {
      state.stopChant();
      publishView();
    },
    get snapshot() {
      return state.snapshot;
    },
    get beadTotal() {
      return beads.total;
    },
  };
}
