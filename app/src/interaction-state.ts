// What the visitor is doing, as one small state machine. Pure: scene.ts
// feeds it input and reads the snapshot to pick a pose. The snapshot
// mirrors the original's per-visitor `pose` + `beads` fields, so Milestone 6
// can send it to the server as is.

import type { Activity } from "../../shared/protocol";

// The list of activities is a protocol rule (the server rejects others).
export { type Activity } from "../../shared/protocol";

export interface InteractionSnapshot {
  activity: Activity;
  // The cushion sat on; kept through greeting, bowing and beads while seated.
  seatIndex: number | null;
  holdingBroom: boolean;
  beadsVisible: boolean;
}

export interface InteractionState {
  readonly snapshot: InteractionSnapshot;
  readonly activitySeconds: number;
  startMoving: () => void;
  stopMoving: () => void;
  sit: (seatIndex: number) => boolean;
  greet: () => boolean;
  bow: (isInStatueZone: boolean) => boolean;
  turnBead: () => boolean;
  toggleBroom: () => boolean;
  // Chanting (Milestone 7) lasts until moving or stopChant.
  chant: () => boolean;
  stopChant: () => void;
  // The server refused the cushion: stand up where we are.
  standUp: () => void;
  tick: (deltaSeconds: number) => void;
}

export const GREET_SECONDS = 1.5;
export const BOW_SECONDS = 2.4;

const TIMED: Partial<Record<Activity, number>> = {
  greeting: GREET_SECONDS,
  bowing: BOW_SECONDS,
};

interface Machine {
  activity: Activity;
  seatIndex: number | null;
  isHoldingBroom: boolean;
  activitySeconds: number;
}

function enter(machine: Machine, next: Activity): Machine {
  return { ...machine, activity: next, activitySeconds: 0 };
}

// Standing still or seated, not mid-greeting/bow: hands are free to act.
function isAtRest({ activity }: Machine): boolean {
  return activity === "idle" || activity === "seated" || activity === "beads";
}

function restingActivity({ seatIndex }: Machine): Activity {
  return seatIndex === null ? "idle" : "seated";
}

function canUseHands(machine: Machine): boolean {
  return !machine.isHoldingBroom && isAtRest(machine);
}

// Each action below returns the next state, or null when it is refused.

function sit(machine: Machine, index: number): Machine | null {
  if (machine.isHoldingBroom || machine.seatIndex !== null) return null;
  if (machine.activity !== "idle" && machine.activity !== "beads") return null;
  return enter({ ...machine, seatIndex: index }, "seated");
}

function bow(machine: Machine, isInStatueZone: boolean): Machine | null {
  if (!canUseHands(machine)) return null;
  if (!isInStatueZone && machine.seatIndex === null) return null;
  return enter(machine, "bowing");
}

function turnBead(machine: Machine): Machine | null {
  if (!canUseHands(machine)) return null;
  return machine.activity === "beads" ? machine : enter(machine, "beads");
}

function toggleBroom(machine: Machine): Machine | null {
  if (machine.seatIndex !== null) return null;
  if (machine.activity !== "idle" && machine.activity !== "beads") return null;
  return enter({ ...machine, isHoldingBroom: !machine.isHoldingBroom }, "idle");
}

function startMoving(machine: Machine): Machine {
  const standing = { ...machine, seatIndex: null };
  return machine.activity === "walking" ? standing : enter(standing, "walking");
}

function standUp(machine: Machine): Machine {
  return machine.seatIndex === null ? machine : enter({ ...machine, seatIndex: null }, "idle");
}

function tick(machine: Machine, deltaSeconds: number): Machine {
  const aged = { ...machine, activitySeconds: machine.activitySeconds + deltaSeconds };
  const duration = TIMED[aged.activity];
  return duration !== undefined && aged.activitySeconds >= duration ? enter(aged, restingActivity(aged)) : aged;
}

export function createInteractionState(): InteractionState {
  let machine: Machine = { activity: "idle", seatIndex: null, isHoldingBroom: false, activitySeconds: 0 };

  function didApply(next: Machine | null): boolean {
    if (next === null) return false;
    machine = next;
    return true;
  }

  return {
    get snapshot() {
      return {
        activity: machine.activity,
        seatIndex: machine.seatIndex,
        holdingBroom: machine.isHoldingBroom,
        beadsVisible: machine.activity === "beads",
      };
    },
    get activitySeconds() {
      return machine.activitySeconds;
    },
    startMoving() {
      machine = startMoving(machine);
    },
    stopMoving() {
      if (machine.activity === "walking") machine = enter(machine, "idle");
    },
    sit: (index) => didApply(sit(machine, index)),
    greet: () => didApply(canUseHands(machine) ? enter(machine, "greeting") : null),
    bow: (isInStatueZone) => didApply(bow(machine, isInStatueZone)),
    turnBead: () => didApply(turnBead(machine)),
    toggleBroom: () => didApply(toggleBroom(machine)),
    chant: () => didApply(canUseHands(machine) ? enter(machine, "chanting") : null),
    stopChant() {
      if (machine.activity === "chanting") machine = enter(machine, restingActivity(machine));
    },
    standUp() {
      machine = standUp(machine);
    },
    tick(deltaSeconds) {
      machine = tick(machine, deltaSeconds);
    },
  };
}
