import type { Object3D, Scene } from "three";

import type { AvatarRig } from "./avatar-rig";
import type { BeadCounter } from "./bead-counter";
import { BEAD_TOTAL_KEY, createBeadCounter, createStorageBeadStore } from "./bead-counter";
import type { BodyPose } from "./body-pose";
import { blendPose } from "./body-pose";
import { createHeldProps, placeHeldProps } from "./held-props";
import type { InteractionAction, InteractionKey, Prompt } from "./interaction-prompts";
import { beadCounterText, promptsFor } from "./interaction-prompts";
import { createLeafMesh, syncLeafMesh, turnBeadString } from "./interaction-props";
import type { InteractionSnapshot, InteractionState } from "./interaction-state";
import { createInteractionState } from "./interaction-state";
import type { Targets } from "./interaction-targets";
import { findTargets, seatHeading } from "./interaction-targets";
import { createLeafField } from "./leaf-field";
import type { MovementController, Point } from "./movement";
import { poseForActivity } from "./pose-for-activity";
import {
  BELL_TOWER,
  BROOM_SPOT,
  groundHeightAt,
  INCENSE_URNS,
  LEAF_SOURCES,
  MEDITATION_SEATS,
  PAGODA_HALL_STATUE_ZONE,
  STATUE_ZONE,
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
  rig: AvatarRig;
  // Cushions other visitors sit on (Milestone 6).
  occupiedSeats?: () => ReadonlySet<number>;
  setHeading: (heading: number) => void;
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  onView?: (view: InteractionView) => void;
  onRingBell?: () => void;
  // The visitor lit incense at INCENSE_URNS[urnIndex] (picture only: smoke).
  onLightIncense?: (urnIndex: number) => void;
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

const KEY_CODES = new Map<string, InteractionKey>([
  ["KeyE", "E"],
  ["KeyQ", "Q"],
  ["KeyB", "B"],
  ["KeyH", "H"],
]);
const POSE_BLEND_SECONDS = 0.25;
const SWEEP_RADIUS = 1;
const LEAF_CAP = 160;
const LEAF_INITIAL = 90;

const noStorage = { getItem: () => null, setItem: () => {} };

const TARGET_LAYOUT = {
  seats: MEDITATION_SEATS,
  broomSpot: BROOM_SPOT,
  statueZone: STATUE_ZONE,
  extraStatueZones: [PAGODA_HALL_STATUE_ZONE],
  incense: INCENSE_URNS,
  bell: BELL_TOWER,
};

function standBroomAtSpot(broom: Object3D): void {
  broom.position.set(BROOM_SPOT.x, groundHeightAt(BROOM_SPOT), BROOM_SPOT.z);
  broom.rotation.set(0, 0, 0.12);
  broom.scale.set(1, 1, 1);
}

// The falling leaves; each frame they fall, and a walking broom sweeps them.
function createLeaves(scene: Scene): (deltaSeconds: number, sweepAt: Point | null) => void {
  const field = createLeafField({ sources: LEAF_SOURCES, cap: LEAF_CAP, initial: LEAF_INITIAL });
  const mesh = createLeafMesh(LEAF_CAP);
  scene.add(mesh);
  syncLeafMesh(mesh, field.leaves, groundHeightAt);
  return (deltaSeconds, sweepAt) => {
    const isChanged = field.update(deltaSeconds);
    const swept = sweepAt ? field.sweep(sweepAt, SWEEP_RADIUS) : 0;
    if (isChanged || swept > 0) syncLeafMesh(mesh, field.leaves, groundHeightAt);
  };
}

// Blends over a short time whenever the kind of pose changes.
function createPoseBlender(): (snapshot: InteractionSnapshot, target: BodyPose, deltaSeconds: number) => BodyPose {
  let poseKey = "";
  let blendFrom: BodyPose = { bones: {}, hipsDrop: 0 };
  let blendSeconds = POSE_BLEND_SECONDS;
  let shownPose: BodyPose = blendFrom;
  return (snapshot, target, deltaSeconds) => {
    const nextKey = `${snapshot.activity}|${String(snapshot.seatIndex !== null)}|${String(snapshot.holdingBroom)}`;
    if (nextKey !== poseKey) {
      poseKey = nextKey;
      blendFrom = shownPose;
      blendSeconds = 0;
    }
    blendSeconds += deltaSeconds;
    shownPose =
      blendSeconds < POSE_BLEND_SECONDS ? blendPose(blendFrom, target, blendSeconds / POSE_BLEND_SECONDS) : target;
    return shownPose;
  };
}

// Passes a view on only when it differs from the last one.
function createViewPublisher(onView?: (view: InteractionView) => void): (view: InteractionView) => void {
  let lastViewKey = "";
  return (view) => {
    const key = JSON.stringify(view);
    if (key === lastViewKey) return;
    lastViewKey = key;
    onView?.(view);
  };
}

interface ActionContext {
  state: InteractionState;
  targets: Targets;
  deps: InteractionRuntimeDeps;
  beads: BeadCounter;
  broom: Object3D;
  beadString: Object3D;
}

function didSit({ state, targets, deps }: ActionContext): boolean {
  const index = targets.seatIndex;
  const seat = index === null ? undefined : MEDITATION_SEATS[index];
  if (index === null || !seat || !state.sit(index)) return false;
  deps.movement.placeAt(seat);
  deps.setHeading(seatHeading(seat));
  return true;
}

// Joined palms while the incense is lit; the smoke is the scene's business.
function lightIncense({ state, targets, deps }: ActionContext): void {
  if (state.greet() && targets.incenseIndex !== null) deps.onLightIncense?.(targets.incenseIndex);
}

// Returns false when nothing happened and the view need not be refreshed.
function didRunAction(action: InteractionAction, context: ActionContext): boolean {
  const { state } = context;
  switch (action) {
    case "sit": {
      return didSit(context);
    }
    case "bow": {
      state.bow(context.targets.inStatueZone);
      return true;
    }
    case "takeBroom":
    case "leaveBroom": {
      if (state.toggleBroom() && !state.snapshot.holdingBroom) standBroomAtSpot(context.broom);
      return true;
    }
    case "greet": {
      state.greet();
      return true;
    }
    case "ringBell": {
      context.deps.onRingBell?.();
      return true;
    }
    case "incense": {
      lightIncense(context);
      return true;
    }
    case "bead": {
      if (state.turnBead()) {
        context.beads.turn();
        turnBeadString(context.beadString);
      }
      return true;
    }
    default: {
      return true;
    }
  }
}

function offeredPrompt(prompts: Prompt[], code: string): Prompt | undefined {
  const key = KEY_CODES.get(code);
  return key === undefined ? undefined : prompts.find((candidate) => candidate.key === key);
}

type ActivityControls = Pick<
  InteractionRuntime,
  "startMoving" | "stopMoving" | "standUp" | "startChanting" | "stopChanting"
>;

// Activity changes that need no target; those that can change the HUD refresh it.
function activityControls(state: InteractionState, publishView: () => void): ActivityControls {
  return {
    startMoving() {
      if (state.snapshot.activity !== "walking") state.startMoving();
    },
    stopMoving() {
      state.stopMoving();
    },
    standUp() {
      state.standUp();
      publishView();
    },
    startChanting() {
      const isStarted = state.chant();
      publishView();
      return isStarted;
    },
    stopChanting() {
      state.stopChant();
      publishView();
    },
  };
}

export function createInteractionRuntime(deps: InteractionRuntimeDeps): InteractionRuntime {
  const { scene, avatar, movement } = deps;
  const state = createInteractionState();
  const beads = createBeadCounter(createStorageBeadStore(deps.storage ?? noStorage, BEAD_TOTAL_KEY));
  const held = createHeldProps(scene);
  const updateLeaves = createLeaves(scene);
  standBroomAtSpot(held.broom);
  const blendTo = createPoseBlender();
  const publish = createViewPublisher(deps.onView);
  let targets: Targets = findTargets(movement.position, TARGET_LAYOUT);
  let prompts: Prompt[] = [];

  function publishView(): void {
    prompts = promptsFor(state.snapshot, targets);
    const beadText = state.snapshot.beadsVisible ? beadCounterText(beads.round, beads.total) : null;
    publish({ prompts, beadText });
  }

  function perform(action: InteractionAction): void {
    // Only what the HUD currently offers, so keys and buttons share the rules.
    if (prompts.every((prompt) => prompt.action !== action)) return;
    const { broom, beadString } = held;
    if (didRunAction(action, { state, targets, deps, beads, broom, beadString })) publishView();
  }

  return {
    perform,
    handleKey(code) {
      const prompt = offeredPrompt(prompts, code);
      if (!prompt) return false;
      perform(prompt.action);
      return true;
    },
    ...activityControls(state, publishView),
    update(deltaSeconds, walkSeconds) {
      state.tick(deltaSeconds);
      const { snapshot } = state;
      targets = findTargets(movement.position, { ...TARGET_LAYOUT, occupied: deps.occupiedSeats?.() });
      updateLeaves(deltaSeconds, snapshot.holdingBroom && snapshot.activity === "walking" ? movement.position : null);
      publishView();
      return blendTo(snapshot, poseForActivity(snapshot, state.activitySeconds, walkSeconds), deltaSeconds);
    },
    placeProps(walkSeconds) {
      const { holdingBroom, beadsVisible, activity } = state.snapshot;
      placeHeldProps(held, avatar, deps.rig, {
        holdingBroom,
        beadsVisible,
        walking: activity === "walking",
        walkSeconds,
      });
    },
    get snapshot() {
      return state.snapshot;
    },
    get beadTotal() {
      return beads.total;
    },
  };
}
