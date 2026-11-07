import { describe, it, expect } from "vitest";
import { MAX_NAME_LENGTH, SEAT_COUNT, parseClientMessage } from "./protocol.js";

const goodState = {
  type: "state",
  x: 1.5,
  z: -20,
  heading: 3.14,
  activity: "seated",
  seatIndex: 12,
  holdingBroom: false,
  beadsVisible: false,
  beadTotal: 108,
};

function raw(value: unknown): string {
  return JSON.stringify(value);
}

describe("parseClientMessage: join", () => {
  it("accepts a name and robe colour, trimming the name", () => {
    expect(parseClientMessage(raw({ type: "join", name: "  Thiện Tâm ", colorIndex: 2 }))).toEqual({
      type: "join",
      name: "Thiện Tâm",
      colorIndex: 2,
    });
  });

  it.each([
    ["empty name", { name: "   ", colorIndex: 0 }],
    ["long name", { name: "x".repeat(MAX_NAME_LENGTH + 1), colorIndex: 0 }],
    ["name not a string", { name: 5, colorIndex: 0 }],
    ["colour out of range", { name: "A", colorIndex: 5 }],
    ["colour not an integer", { name: "A", colorIndex: 1.5 }],
  ])("rejects %s", (_label, fields) => {
    expect(parseClientMessage(raw({ type: "join", ...fields }))).toBeNull();
  });
});

describe("parseClientMessage: state", () => {
  it("accepts a valid state", () => {
    expect(parseClientMessage(raw(goodState))).toEqual(goodState);
  });

  it("accepts standing (seatIndex null)", () => {
    expect(parseClientMessage(raw({ ...goodState, activity: "idle", seatIndex: null }))).not.toBeNull();
  });

  it.each([
    ["x not finite", { x: "1" }],
    ["z outside the world", { z: 301 }],
    ["heading missing", { heading: undefined }],
    ["unknown activity", { activity: "dancing" }],
    ["seat out of range", { seatIndex: SEAT_COUNT }],
    ["negative seat", { seatIndex: -1 }],
    ["fractional seat", { seatIndex: 1.5 }],
    ["broom not boolean", { holdingBroom: "yes" }],
    ["beads not boolean", { beadsVisible: 1 }],
    ["negative bead total", { beadTotal: -3 }],
    ["fractional bead total", { beadTotal: 2.5 }],
  ])("rejects %s", (_label, fields) => {
    expect(parseClientMessage(raw({ ...goodState, ...fields }))).toBeNull();
  });
});

describe("parseClientMessage: anything else", () => {
  it.each([
    ["bad JSON", "{not json"],
    ["a JSON string", raw("join")],
    ["null", "null"],
    ["unknown type", raw({ type: "chat", text: "hi" })],
    ["an array", raw([goodState])],
  ])("rejects %s", (_label, text) => {
    expect(parseClientMessage(text)).toBeNull();
  });

  it("drops unknown extra fields", () => {
    const parsed = parseClientMessage(raw({ ...goodState, admin: true }));
    expect(parsed).not.toHaveProperty("admin");
  });
});
