import { describe, expect, it } from "vitest";

import type { VisitorState } from "./protocol.js";
import { createVisitorRoom } from "./visitor-room.js";

const standing: VisitorState = {
  x: 0,
  z: 5,
  heading: Math.PI,
  activity: "idle",
  seatIndex: null,
  holdingBroom: false,
  beadsVisible: false,
  beadTotal: 0,
};

const seatedAtSeven: VisitorState = { ...standing, activity: "seated", seatIndex: 7 };

describe("visitor room", () => {
  it("lists joined visitors with their name, colour and state", () => {
    const room = createVisitorRoom();
    room.join("a", "An", 1);
    room.updateState("a", { ...standing, x: 3 });
    expect(room.snapshot()).toEqual([{ id: "a", name: "An", colorIndex: 1, ...standing, x: 3 }]);
  });

  it("starts a joined visitor at a default standing state", () => {
    const room = createVisitorRoom();
    room.join("a", "An", 0);
    expect(room.snapshot()[0]).toMatchObject({ activity: "idle", seatIndex: null });
  });

  it("ignores state from a visitor who has not joined", () => {
    const room = createVisitorRoom();
    expect(room.updateState("ghost", standing)).toBe("ignored");
    expect(room.snapshot()).toEqual([]);
  });

  it("re-joining updates name and colour without duplicating", () => {
    const room = createVisitorRoom();
    room.join("a", "An", 0);
    room.join("a", "Bình", 3);
    expect(room.snapshot()).toHaveLength(1);
    expect(room.snapshot()[0]).toMatchObject({ name: "Bình", colorIndex: 3 });
  });

  it("removes a visitor who leaves", () => {
    const room = createVisitorRoom();
    room.join("a", "An", 0);
    room.leave("a");
    expect(room.snapshot()).toEqual([]);
  });

  it("looks up a joined visitor's current name, undefined once gone", () => {
    const room = createVisitorRoom();
    room.join("a", "An", 0);
    expect(room.nameOf("a")).toBe("An");
    room.leave("a");
    expect(room.nameOf("a")).toBeUndefined();
  });

  describe("cushions", () => {
    it("refuses a cushion another visitor sits on, keeping the visitor standing", () => {
      const room = createVisitorRoom();
      room.join("a", "An", 0);
      room.join("b", "Bình", 1);
      expect(room.updateState("a", seatedAtSeven)).toBe("ok");
      expect(room.updateState("b", { ...seatedAtSeven, x: 9 })).toBe("seat-refused");
      const b = room.snapshot().find((visitor) => visitor.id === "b");
      expect(b).toMatchObject({ seatIndex: null, activity: "idle", x: 9 });
    });

    it("keeps the seat through greeting and beads while seated", () => {
      const room = createVisitorRoom();
      room.join("a", "An", 0);
      room.updateState("a", seatedAtSeven);
      expect(room.updateState("a", { ...seatedAtSeven, activity: "greeting" })).toBe("ok");
      room.join("b", "Bình", 1);
      expect(room.updateState("b", seatedAtSeven)).toBe("seat-refused");
    });

    it("frees the cushion when its visitor stands or leaves", () => {
      const room = createVisitorRoom();
      room.join("a", "An", 0);
      room.join("b", "Bình", 1);
      room.updateState("a", seatedAtSeven);
      room.updateState("a", standing);
      expect(room.updateState("b", seatedAtSeven)).toBe("ok");
      room.leave("b");
      expect(room.updateState("a", seatedAtSeven)).toBe("ok");
    });
  });

  it("marks itself dirty on changes until the change is taken", () => {
    const room = createVisitorRoom();
    expect(room.takeDirty()).toBe(false);
    room.join("a", "An", 0);
    expect(room.takeDirty()).toBe(true);
    expect(room.takeDirty()).toBe(false);
    room.updateState("a", standing);
    expect(room.takeDirty()).toBe(true);
    room.updateState("a", standing);
    expect(room.takeDirty()).toBe(false);
    room.updateState("a", { ...standing, x: 1 });
    expect(room.takeDirty()).toBe(true);
    room.leave("a");
    expect(room.takeDirty()).toBe(true);
  });
});
