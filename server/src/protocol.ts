// Messages between the temple client and this server (Milestone 6,
// docs/specs/milestone-6-visitors/design.md). Everything a client sends is
// untrusted: parseClientMessage accepts only the exact shapes below.

import type { Activity } from "../../shared/protocol.js";
import {
  ACTIVITIES,
  MAX_CHAT_LENGTH,
  MAX_NAME_LENGTH,
  ROBE_COLOR_COUNT,
  SEAT_COUNT,
  WORLD_LIMIT,
} from "../../shared/protocol.js";

// Letters (incl. Vietnamese diacritics), digits, spaces, apostrophes and
// hyphens only — no HTML/markup characters (<, >, &, quotes, slashes, …).
const NAME_PATTERN = /^[\p{L}\p{N}\p{M} '-]+$/u;

export interface JoinMessage {
  type: "join";
  name: string;
  colorIndex: number;
}

export interface ChatSendMessage {
  type: "chat";
  text: string;
}

export interface ChatEntry {
  id: string;
  name: string;
  text: string;
  ts: number;
}

export interface VisitorState {
  x: number;
  z: number;
  heading: number;
  activity: Activity;
  seatIndex: number | null;
  holdingBroom: boolean;
  beadsVisible: boolean;
  beadTotal: number;
}

export interface StateMessage extends VisitorState {
  type: "state";
}

export type ClientMessage = JoinMessage | StateMessage | ChatSendMessage;

export interface VisitorView extends VisitorState {
  id: string;
  name: string;
  colorIndex: number;
}

export type ServerMessage =
  | { type: "presence"; count: number }
  | { type: "welcome"; id: string }
  | { type: "visitors"; visitors: VisitorView[] }
  | { type: "seat-refused"; seatIndex: number }
  | { type: "chat"; message: ChatEntry }
  | { type: "chat-history"; messages: ChatEntry[] }
  // One bell toll, broadcast to everyone present when a visitor joins
  // (owner, 2026-11-10: "ai vào có 1 hồi chuông cho tôi").
  | { type: "bell" }
  // Sent once right after connecting, before any join: the pháp danh
  // already locked to this visitor's ip, or null for a first-time ip
  // (owner, 2026-11-10: "mỗi người sẽ phải để 1 pháp danh... trùng với
  // ip của họ").
  | { type: "name-lock"; name: string | null }
  | { type: "join-refused"; reason: "default-name" };

type Fields = Record<string, unknown>;

// 0 <= value < maxExclusive, a whole number.
function isWholeNumberBelow(value: unknown, maxExclusive: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) < maxExclusive;
}

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= WORLD_LIMIT;
}

function parseJoin(fields: Fields): JoinMessage | null {
  if (typeof fields.name !== "string") return null;
  const name = fields.name.trim();
  return name.length === 0 ||
    name.length > MAX_NAME_LENGTH ||
    !NAME_PATTERN.test(name) ||
    !isWholeNumberBelow(fields.colorIndex, ROBE_COLOR_COUNT)
    ? null
    : { type: "join", name, colorIndex: fields.colorIndex };
}

function parseState(fields: Fields): StateMessage | null {
  const { x, z, heading, activity, seatIndex, holdingBroom, beadsVisible, beadTotal } = fields;
  if (
    typeof heading !== "number" ||
    !isCoordinate(x) ||
    !isCoordinate(z) ||
    !Number.isFinite(heading) ||
    !ACTIVITIES.includes(activity as Activity)
  )
    return null;
  if (seatIndex !== null && !isWholeNumberBelow(seatIndex, SEAT_COUNT)) return null;
  if (
    typeof holdingBroom !== "boolean" ||
    typeof beadsVisible !== "boolean" ||
    !isWholeNumberBelow(beadTotal, Number.MAX_SAFE_INTEGER)
  )
    return null;
  return {
    type: "state",
    x,
    z,
    heading,
    activity: activity as Activity,
    seatIndex,
    holdingBroom,
    beadsVisible,
    beadTotal,
  };
}

function parseChat(fields: Fields): ChatSendMessage | null {
  if (typeof fields.text !== "string") return null;
  const text = fields.text.trim();
  return text.length === 0 || text.length > MAX_CHAT_LENGTH ? null : { type: "chat", text };
}

export function parseClientMessage(text: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    // malformed JSON from a client is expected noise, not a server error
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const fields = value as Fields;
  if (fields.type === "join") return parseJoin(fields);
  if (fields.type === "state") return parseState(fields);
  if (fields.type === "chat") return parseChat(fields);
  return null;
}

export {
  ACTIVITIES,
  type Activity,
  MAX_CHAT_LENGTH,
  MAX_NAME_LENGTH,
  ROBE_COLOR_COUNT,
  SEAT_COUNT,
  WORLD_LIMIT,
} from "../../shared/protocol.js";
