import { describe, it, expect } from "vitest";
import {
  STATE_INTERVAL_MS,
  encodeChat,
  encodeJoin,
  encodeState,
  parseServerMessage,
  shouldSendState,
  type OutgoingState,
} from "./visitor-protocol";
import { MEDITATION_SEATS, WORLD_LIMIT } from "./temple-layout";
import { SEAT_COUNT, WORLD_LIMIT as SERVER_WORLD_LIMIT } from "../../server/src/protocol";

const state: OutgoingState = {
  x: 1.23456,
  z: -5,
  heading: 3.14159,
  activity: "seated",
  seatIndex: 4,
  holdingBroom: false,
  beadsVisible: false,
  beadTotal: 9,
};

const view = { id: "v1", name: "An", colorIndex: 1, ...state };

describe("layout agrees with the server", () => {
  it("has the same cushion count and world limit", () => {
    expect(MEDITATION_SEATS.length).toBe(SEAT_COUNT);
    expect(WORLD_LIMIT).toBe(SERVER_WORLD_LIMIT);
  });
});

describe("encode", () => {
  it("encodes join", () => {
    expect(JSON.parse(encodeJoin("An", 2))).toEqual({ type: "join", name: "An", colorIndex: 2 });
  });

  it("encodes state with positions rounded to 0.01", () => {
    expect(JSON.parse(encodeState(state))).toEqual({
      type: "state",
      ...state,
      x: 1.23,
      heading: 3.14,
    });
  });

  it("encodes chat", () => {
    expect(JSON.parse(encodeChat("Xin chào"))).toEqual({ type: "chat", text: "Xin chào" });
  });
});

describe("parseServerMessage", () => {
  it("parses presence, welcome and seat refusal", () => {
    expect(parseServerMessage('{"type":"presence","count":3}')).toEqual({ type: "presence", count: 3 });
    expect(parseServerMessage('{"type":"welcome","id":"v1"}')).toEqual({ type: "welcome", id: "v1" });
    expect(parseServerMessage('{"type":"seat-refused","seatIndex":4}')).toEqual({
      type: "seat-refused",
      seatIndex: 4,
    });
  });

  it("parses visitors and drops malformed entries", () => {
    const parsed = parseServerMessage(
      JSON.stringify({ type: "visitors", visitors: [view, { ...view, id: 5 }, { ...view, activity: "flying" }] }),
    );
    expect(parsed).toEqual({ type: "visitors", visitors: [view] });
  });

  it("rejects junk", () => {
    expect(parseServerMessage("nope")).toBeNull();
    expect(parseServerMessage('{"type":"visitors","visitors":"x"}')).toBeNull();
    expect(parseServerMessage('{"type":"other"}')).toBeNull();
  });

  it("parses a chat message and a chat-history batch, dropping malformed entries", () => {
    const entry = { id: "m1", name: "An", text: "Xin chào", ts: 123 };
    expect(parseServerMessage(JSON.stringify({ type: "chat", message: entry }))).toEqual({
      type: "chat",
      message: entry,
    });
    expect(
      parseServerMessage(JSON.stringify({ type: "chat-history", messages: [entry, { id: 5 }] })),
    ).toEqual({ type: "chat-history", messages: [entry] });
  });
});

describe("shouldSendState", () => {
  it("sends the first state", () => {
    expect(shouldSendState(null, state, 0)).toBe(true);
  });

  it("waits for the interval and for a change", () => {
    expect(shouldSendState(state, { ...state, x: 2 }, STATE_INTERVAL_MS - 1)).toBe(false);
    expect(shouldSendState(state, { ...state, x: 2 }, STATE_INTERVAL_MS)).toBe(true);
    expect(shouldSendState(state, { ...state }, STATE_INTERVAL_MS * 10)).toBe(false);
  });

  it("ignores changes smaller than the rounding", () => {
    expect(shouldSendState(state, { ...state, x: state.x + 0.0001 }, STATE_INTERVAL_MS)).toBe(false);
  });
});
