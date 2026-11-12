import { Object3D, Scene } from "three";
import { describe, expect, it, vi } from "vitest";

import type { AvatarRig } from "./avatar-rig";
import { BEAD_TOTAL_KEY } from "./bead-counter";
import type { InteractionView } from "./interaction-runtime";
import { createInteractionRuntime } from "./interaction-runtime";
import type { MovementController, Point } from "./movement";
import { BELL_TOWER, BROOM_SPOT, MEDITATION_SEATS } from "./temple-layout";

const FRAME = 1 / 60;
const FAR_AWAY: Point = { x: 200, z: 200 };

function fakeMovement(start: Point): MovementController {
  let position = { ...start };
  return {
    get position() {
      return position;
    },
    isWalking: false,
    facingAngle: 0,
    moveTo: vi.fn<(target: Point) => void>(),
    stop: vi.fn<() => void>(),
    placeAt(point) {
      position = { ...point };
    },
    update: () => position,
  };
}

const rig: AvatarRig = { bone: () => new Object3D(), applyPose: () => {} };

function setup(start: Point) {
  const scene = new Scene();
  const movement = fakeMovement(start);
  const views: InteractionView[] = [];
  const onRingBell = vi.fn<() => void>();
  const setHeading = vi.fn<(heading: number) => void>();
  const stored = new Map<string, string>();
  const runtime = createInteractionRuntime({
    scene,
    avatar: new Object3D(),
    movement,
    rig,
    setHeading,
    storage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    onView: (view) => {
      views.push(view);
    },
    onRingBell,
  });
  runtime.update(FRAME, 0);
  return { scene, movement, views, onRingBell, setHeading, stored, runtime };
}

function actions(view: InteractionView | undefined): string[] {
  return view?.prompts.map((prompt) => prompt.action) ?? [];
}

describe("createInteractionRuntime", () => {
  it("offers greet and bead away from everything, and publishes a view only when it changes", () => {
    const { views, runtime } = setup(FAR_AWAY);
    expect(actions(views.at(-1))).toStrictEqual(["greet", "bead"]);
    runtime.update(FRAME, 0);
    runtime.update(FRAME, 0);
    expect(views).toHaveLength(1);
  });

  it("ignores keys that are not offered and maps E/Q/B to the offered action", () => {
    const { runtime } = setup(FAR_AWAY);
    expect(runtime.handleKey("KeyX")).toBe(false);
    expect(runtime.handleKey("KeyE")).toBe(false);
    expect(runtime.handleKey("KeyQ")).toBe(true);
    expect(runtime.snapshot.activity).toBe("greeting");
  });

  it("does nothing for an action the HUD does not offer", () => {
    const { onRingBell, runtime } = setup(FAR_AWAY);
    runtime.perform("ringBell");
    expect(onRingBell).not.toHaveBeenCalled();
  });

  it("rings the bell near the bell tower", () => {
    const { onRingBell, runtime } = setup({ x: BELL_TOWER.x, z: BELL_TOWER.z + BELL_TOWER.half + 0.5 });
    runtime.perform("ringBell");
    expect(onRingBell).toHaveBeenCalledOnce();
  });

  it("sits on the nearest cushion, facing it, and stands up when refused", () => {
    const seat = MEDITATION_SEATS.at(0);
    if (!seat) throw new Error("no seats");
    const { movement, setHeading, runtime } = setup({ x: seat.x + 0.2, z: seat.z });
    runtime.perform("sit");
    expect(runtime.snapshot.seatIndex).toBe(0);
    expect(movement.position).toStrictEqual(seat);
    expect(setHeading).toHaveBeenCalledOnce();
    runtime.standUp();
    expect(runtime.snapshot.seatIndex).toBeNull();
  });

  it("takes the broom and stands it back at its spot", () => {
    const { scene, runtime } = setup(BROOM_SPOT);
    runtime.perform("takeBroom");
    expect(runtime.snapshot.holdingBroom).toBe(true);
    runtime.update(FRAME, 0);
    runtime.perform("leaveBroom");
    expect(runtime.snapshot.holdingBroom).toBe(false);
    const standing = scene.children.filter(
      (child) => child.position.x === BROOM_SPOT.x && child.position.z === BROOM_SPOT.z,
    );
    expect(standing.map((child) => child.rotation.z)).toContain(0.12);
  });

  it("counts a bead, stores the total and shows the counter", () => {
    const { views, stored, runtime } = setup(FAR_AWAY);
    runtime.perform("bead");
    expect(runtime.beadTotal).toBe(1);
    expect(stored.get(BEAD_TOTAL_KEY)).toBe("1");
    expect(views.at(-1)?.beadText).toContain("tổng 1");
  });

  it("blends into a new pose instead of jumping", () => {
    const { runtime } = setup(FAR_AWAY);
    const idle = runtime.update(FRAME, 0);
    runtime.perform("greet");
    const firstFrame = runtime.update(FRAME, 0);
    let settled = firstFrame;
    for (let frame = 0; frame < 30; frame += 1) settled = runtime.update(FRAME, 0);
    expect(firstFrame).not.toStrictEqual(settled);
    expect(firstFrame).not.toStrictEqual(idle);
  });

  it("starts and stops chanting", () => {
    const { runtime } = setup(FAR_AWAY);
    expect(runtime.startChanting()).toBe(true);
    expect(runtime.snapshot.activity).toBe("chanting");
    runtime.stopChanting();
    expect(runtime.snapshot.activity).toBe("idle");
  });
});
