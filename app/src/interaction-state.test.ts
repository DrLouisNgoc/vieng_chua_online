import { describe, it, expect } from "vitest";
import {
  BOW_SECONDS,
  GREET_SECONDS,
  createInteractionState,
} from "./interaction-state";

function seatedState(seat = 3) {
  const state = createInteractionState();
  state.sit(seat);
  return state;
}

describe("interaction state", () => {
  it("starts idle, standing, empty-handed", () => {
    expect(createInteractionState().snapshot).toEqual({
      activity: "idle",
      seatIndex: null,
      holdingBroom: false,
      beadsVisible: false,
    });
  });

  it("walks on movement and goes idle when it stops", () => {
    const state = createInteractionState();
    state.startMoving();
    expect(state.snapshot.activity).toBe("walking");
    state.stopMoving();
    expect(state.snapshot.activity).toBe("idle");
  });

  describe("sitting", () => {
    it("sits on a seat from idle", () => {
      const state = seatedState(7);
      expect(state.snapshot).toMatchObject({ activity: "seated", seatIndex: 7 });
    });

    it("stands up and walks when moving", () => {
      const state = seatedState();
      state.startMoving();
      expect(state.snapshot).toMatchObject({ activity: "walking", seatIndex: null });
    });

    it("refuses while walking or holding the broom", () => {
      const walking = createInteractionState();
      walking.startMoving();
      expect(walking.sit(1)).toBe(false);

      const sweeping = createInteractionState();
      sweeping.toggleBroom();
      expect(sweeping.sit(1)).toBe(false);
      expect(sweeping.snapshot.activity).toBe("idle");
    });

    it("refuses to sit again while seated", () => {
      const state = seatedState(2);
      expect(state.sit(5)).toBe(false);
      expect(state.snapshot.seatIndex).toBe(2);
    });
  });

  describe("greeting", () => {
    it("lasts GREET_SECONDS then returns to idle", () => {
      const state = createInteractionState();
      expect(state.greet()).toBe(true);
      expect(state.snapshot.activity).toBe("greeting");
      state.tick(GREET_SECONDS - 0.01);
      expect(state.snapshot.activity).toBe("greeting");
      state.tick(0.02);
      expect(state.snapshot.activity).toBe("idle");
    });

    it("returns to the seat when started seated", () => {
      const state = seatedState(4);
      state.greet();
      state.tick(GREET_SECONDS + 0.1);
      expect(state.snapshot).toMatchObject({ activity: "seated", seatIndex: 4 });
    });

    it("refuses while walking, while already acting, or holding the broom", () => {
      const walking = createInteractionState();
      walking.startMoving();
      expect(walking.greet()).toBe(false);

      const greeting = createInteractionState();
      greeting.greet();
      expect(greeting.greet()).toBe(false);

      const sweeping = createInteractionState();
      sweeping.toggleBroom();
      expect(sweeping.greet()).toBe(false);
    });

    it("is interrupted by moving", () => {
      const state = createInteractionState();
      state.greet();
      state.startMoving();
      expect(state.snapshot.activity).toBe("walking");
    });
  });

  describe("bowing", () => {
    it("is allowed standing only inside the statue zone", () => {
      expect(createInteractionState().bow(false)).toBe(false);
      const state = createInteractionState();
      expect(state.bow(true)).toBe(true);
      expect(state.snapshot.activity).toBe("bowing");
      state.tick(BOW_SECONDS + 0.01);
      expect(state.snapshot.activity).toBe("idle");
    });

    it("is allowed while seated anywhere and returns to the seat", () => {
      const state = seatedState(9);
      expect(state.bow(false)).toBe(true);
      state.tick(BOW_SECONDS + 0.01);
      expect(state.snapshot).toMatchObject({ activity: "seated", seatIndex: 9 });
    });

    it("refuses while walking or holding the broom", () => {
      const walking = createInteractionState();
      walking.startMoving();
      expect(walking.bow(true)).toBe(false);
      const sweeping = createInteractionState();
      sweeping.toggleBroom();
      expect(sweeping.bow(true)).toBe(false);
    });
  });

  describe("beads", () => {
    it("shows the beads standing and keeps them until moving", () => {
      const state = createInteractionState();
      expect(state.turnBead()).toBe(true);
      expect(state.snapshot).toMatchObject({ activity: "beads", beadsVisible: true });
      expect(state.turnBead()).toBe(true);
      state.startMoving();
      expect(state.snapshot).toMatchObject({ activity: "walking", beadsVisible: false });
    });

    it("keeps the seat while counting seated", () => {
      const state = seatedState(6);
      state.turnBead();
      expect(state.snapshot).toMatchObject({
        activity: "beads",
        seatIndex: 6,
        beadsVisible: true,
      });
    });

    it("puts the beads away to greet or bow, and returns to the seat after", () => {
      const state = seatedState(6);
      state.turnBead();
      state.bow(false);
      expect(state.snapshot.beadsVisible).toBe(false);
      state.tick(BOW_SECONDS + 0.01);
      expect(state.snapshot).toMatchObject({ activity: "seated", seatIndex: 6 });
    });

    it("refuses while walking or holding the broom", () => {
      const walking = createInteractionState();
      walking.startMoving();
      expect(walking.turnBead()).toBe(false);
      const sweeping = createInteractionState();
      sweeping.toggleBroom();
      expect(sweeping.turnBead()).toBe(false);
    });
  });

  describe("broom", () => {
    it("is taken and put back from idle", () => {
      const state = createInteractionState();
      expect(state.toggleBroom()).toBe(true);
      expect(state.snapshot.holdingBroom).toBe(true);
      expect(state.toggleBroom()).toBe(true);
      expect(state.snapshot.holdingBroom).toBe(false);
    });

    it("stays in hand while walking", () => {
      const state = createInteractionState();
      state.toggleBroom();
      state.startMoving();
      state.stopMoving();
      expect(state.snapshot.holdingBroom).toBe(true);
    });

    it("puts the beads away when taken", () => {
      const state = createInteractionState();
      state.turnBead();
      expect(state.toggleBroom()).toBe(true);
      expect(state.snapshot).toMatchObject({ activity: "idle", beadsVisible: false });
    });

    it("refuses while seated or walking", () => {
      expect(seatedState().toggleBroom()).toBe(false);
      const walking = createInteractionState();
      walking.startMoving();
      expect(walking.toggleBroom()).toBe(false);
    });
  });

  it("reports seconds spent in the current activity", () => {
    const state = createInteractionState();
    state.greet();
    state.tick(0.5);
    expect(state.activitySeconds).toBeCloseTo(0.5);
    state.tick(GREET_SECONDS);
    expect(state.activitySeconds).toBe(0);
  });
});
