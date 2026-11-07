// What the visitor is doing, as one small state machine. Pure: scene.ts
// feeds it input and reads the snapshot to pick a pose. The snapshot
// mirrors the original's per-visitor `pose` + `beads` fields, so Milestone 6
// can send it to the server as is.

export type Activity = "idle" | "walking" | "seated" | "greeting" | "bowing" | "beads";

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
  bow: (inStatueZone: boolean) => boolean;
  turnBead: () => boolean;
  toggleBroom: () => boolean;
  tick: (deltaSeconds: number) => void;
}

export const GREET_SECONDS = 1.5;
export const BOW_SECONDS = 2.4;

const TIMED: Partial<Record<Activity, number>> = {
  greeting: GREET_SECONDS,
  bowing: BOW_SECONDS,
};

export function createInteractionState(): InteractionState {
  let activity: Activity = "idle";
  let seatIndex: number | null = null;
  let holdingBroom = false;
  let activitySeconds = 0;

  function enter(next: Activity): void {
    activity = next;
    activitySeconds = 0;
  }

  // Standing still or seated, not mid-greeting/bow: hands are free to act.
  function isAtRest(): boolean {
    return activity === "idle" || activity === "seated" || activity === "beads";
  }

  function restingActivity(): Activity {
    return seatIndex === null ? "idle" : "seated";
  }

  return {
    get snapshot() {
      return {
        activity,
        seatIndex,
        holdingBroom,
        beadsVisible: activity === "beads",
      };
    },
    get activitySeconds() {
      return activitySeconds;
    },
    startMoving() {
      seatIndex = null;
      if (activity !== "walking") enter("walking");
    },
    stopMoving() {
      if (activity === "walking") enter("idle");
    },
    sit(index) {
      if (holdingBroom || seatIndex !== null) return false;
      if (activity !== "idle" && activity !== "beads") return false;
      seatIndex = index;
      enter("seated");
      return true;
    },
    greet() {
      if (holdingBroom || !isAtRest()) return false;
      enter("greeting");
      return true;
    },
    bow(inStatueZone) {
      if (holdingBroom || !isAtRest()) return false;
      if (seatIndex === null && !inStatueZone) return false;
      enter("bowing");
      return true;
    },
    turnBead() {
      if (holdingBroom || !isAtRest()) return false;
      if (activity !== "beads") enter("beads");
      return true;
    },
    toggleBroom() {
      if (seatIndex !== null) return false;
      if (activity !== "idle" && activity !== "beads") return false;
      holdingBroom = !holdingBroom;
      enter("idle");
      return true;
    },
    tick(deltaSeconds) {
      activitySeconds += deltaSeconds;
      const duration = TIMED[activity];
      if (duration !== undefined && activitySeconds >= duration) {
        enter(restingActivity());
      }
    },
  };
}
