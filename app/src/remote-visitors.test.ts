import { Object3D, Scene, Sprite, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import { tintRobe } from "./avatar-look";
import { createRemoteVisitors } from "./remote-visitors";
import type { VisitorView } from "./visitor-protocol";

// The real name label draws on a DOM canvas, which the node test runner lacks.
vi.mock(import("./avatar-look"), async (importOriginal) => ({
  ...(await importOriginal()),
  createNameLabel: () => ({ sprite: new Sprite(), setText: vi.fn<(text: string) => void>() }),
  tintRobe: vi.fn<(avatar: Object3D, color: string) => void>(),
}));

const ROBES = [{ base: "#000001" }, { base: "#000002" }];

function visitor(overrides: Partial<VisitorView> = {}): VisitorView {
  return {
    id: "a",
    name: "Minh",
    colorIndex: 1,
    x: 30,
    z: 30,
    heading: 0,
    activity: "idle",
    seatIndex: null,
    holdingBroom: false,
    beadsVisible: false,
    beadTotal: 0,
    ...overrides,
  };
}

function childAt(scene: Scene, index: number): Object3D {
  const child = scene.children.at(index);
  if (!child) throw new Error(`scene has no child ${String(index)}`);
  return child;
}

function setup(): { scene: Scene; remotes: ReturnType<typeof createRemoteVisitors> } {
  const scene = new Scene();
  const template = new Object3D();
  template.visible = false;
  const remotes = createRemoteVisitors({ scene, template, groundY: 1, robeColors: ROBES });
  return { scene, remotes };
}

describe("createRemoteVisitors", () => {
  it("adds an avatar, a label and held props per visitor, and removes them when the visitor leaves", () => {
    const { scene, remotes } = setup();
    remotes.sync([visitor(), visitor({ id: "b" })]);
    // avatar + label + broom + bead holder, per visitor
    expect(scene.children).toHaveLength(8);
    expect(scene.children.filter((child) => child instanceof Sprite)).toHaveLength(2);
    remotes.sync([visitor({ id: "b" })]);
    expect(scene.children).toHaveLength(4);
    remotes.sync([]);
    expect(scene.children).toHaveLength(0);
  });

  it("tints with the visitor's robe colour, falling back to the first one, and re-tints on change", () => {
    vi.mocked(tintRobe).mockClear();
    const { remotes } = setup();
    remotes.sync([visitor({ colorIndex: 9 })]);
    expect(vi.mocked(tintRobe).mock.calls.at(-1)?.[1]).toBe("#000001");
    remotes.sync([visitor({ colorIndex: 1 })]);
    expect(vi.mocked(tintRobe).mock.calls.at(-1)?.[1]).toBe("#000002");
    expect(tintRobe).toHaveBeenCalledTimes(2);
  });

  it("reports the occupied seats", () => {
    const { remotes } = setup();
    remotes.sync([visitor({ seatIndex: 3 }), visitor({ id: "b" }), visitor({ id: "c", seatIndex: 5 })]);
    expect([...remotes.occupiedSeats()]).toStrictEqual([3, 5]);
  });

  it("moves the avatar toward the visitor's state and places the label above it", () => {
    const { scene, remotes } = setup();
    remotes.sync([visitor()]);
    remotes.sync([visitor({ x: 31, heading: 1, holdingBroom: true })]);
    remotes.update(0.1, new Vector3(30, 0, 30));
    const avatar = childAt(scene, 0);
    const label = childAt(scene, 1);
    const broom = childAt(scene, 2);
    expect(avatar.visible).toBe(true);
    expect(avatar.position.x).toBeGreaterThan(30);
    expect(avatar.position.x).toBeLessThan(31);
    expect(avatar.position.z).toBe(30);
    expect(avatar.rotation.y).toBeGreaterThan(Math.PI);
    expect(label.position.x).toBe(avatar.position.x);
    expect(label.position.y).toBeCloseTo(avatar.position.y + 2.05);
    expect(label.visible).toBe(true);
    expect(broom.visible).toBe(true);
  });

  it("hides the label beyond 40 m from the camera", () => {
    const { scene, remotes } = setup();
    remotes.sync([visitor()]);
    remotes.update(0.1, new Vector3(100, 0, 100));
    expect(childAt(scene, 1).visible).toBe(false);
  });

  it("snaps to a far-away position instead of gliding", () => {
    const { scene, remotes } = setup();
    remotes.sync([visitor()]);
    remotes.sync([visitor({ x: -30 })]);
    remotes.update(0.1, new Vector3(0, 0, 0));
    expect(childAt(scene, 0).position.x).toBe(-30);
  });
});
