import { describe, it, expect } from "vitest";
import { createChatRoom } from "./chatRoom.js";

describe("chatRoom", () => {
  it("adds a message with an id and timestamp", () => {
    const room = createChatRoom();
    const entry = room.add("An", "Xin chào");
    expect(entry).toMatchObject({ name: "An", text: "Xin chào" });
    expect(typeof entry.id).toBe("string");
    expect(typeof entry.ts).toBe("number");
  });

  it("keeps messages in order", () => {
    const room = createChatRoom();
    room.add("An", "một");
    room.add("Bình", "hai");
    expect(room.recent().map((m) => m.text)).toEqual(["một", "hai"]);
  });

  it("drops the oldest message once past the history limit", () => {
    const room = createChatRoom(2);
    room.add("An", "một");
    room.add("An", "hai");
    room.add("An", "ba");
    expect(room.recent().map((m) => m.text)).toEqual(["hai", "ba"]);
  });
});
