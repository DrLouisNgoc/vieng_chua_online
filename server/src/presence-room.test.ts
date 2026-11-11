import { describe, it, expect } from "vitest";
import { createPresenceRoom } from "./presence-room.js";

describe("createPresenceRoom", () => {
  it("starts with zero visitors", () => {
    const room = createPresenceRoom();
    expect(room.count).toBe(0);
  });

  it("join() increments the count and returns a unique visitor id", () => {
    const room = createPresenceRoom();
    const a = room.join();
    const b = room.join();
    expect(room.count).toBe(2);
    expect(a).not.toBe(b);
  });

  it("leave() decrements the count", () => {
    const room = createPresenceRoom();
    const a = room.join();
    room.join();
    room.leave(a);
    expect(room.count).toBe(1);
  });

  it("leave() with an unknown id does not go below zero", () => {
    const room = createPresenceRoom();
    room.join();
    room.leave("not-a-real-id");
    room.leave("not-a-real-id");
    expect(room.count).toBe(1);
  });

  it("leaving the same visitor twice only decrements once", () => {
    const room = createPresenceRoom();
    const a = room.join();
    room.leave(a);
    room.leave(a);
    expect(room.count).toBe(0);
  });
});
