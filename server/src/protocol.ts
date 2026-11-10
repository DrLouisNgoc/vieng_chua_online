// Messages between the temple client and this server (Milestone 6,
// docs/specs/milestone-6-visitors/design.md). Everything a client sends is
// untrusted: parseClientMessage accepts only the exact shapes below.

export const MAX_NAME_LENGTH = 24;
// Letters (incl. Vietnamese diacritics), digits, spaces, apostrophes and
// hyphens only — no HTML/markup characters (<, >, &, quotes, slashes, …).
const NAME_PATTERN = /^[\p{L}\p{N}\p{M} '-]+$/u;
export const MAX_CHAT_LENGTH = 300;
export const ROBE_COLOR_COUNT = 6;
// Must match app/src/temple-layout.ts: 16 x 24 hall cushions + 4 banyan seats.
export const SEAT_COUNT = 388;
// Must match WORLD_LIMIT in app/src/temple-layout.ts.
export const WORLD_LIMIT = 300;

export const ACTIVITIES = [
  "idle",
  "walking",
  "seated",
  "greeting",
  "bowing",
  "beads",
  "chanting",
] as const;
export type Activity = (typeof ACTIVITIES)[number];

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

function isIntegerIn(value: unknown, min: number, maxExclusive: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) < maxExclusive;
}

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= WORLD_LIMIT;
}

function parseJoin(fields: Fields): JoinMessage | null {
  if (typeof fields.name !== "string") return null;
  const name = fields.name.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  if (!NAME_PATTERN.test(name)) return null;
  if (!isIntegerIn(fields.colorIndex, 0, ROBE_COLOR_COUNT)) return null;
  return { type: "join", name, colorIndex: fields.colorIndex };
}

function parseState(fields: Fields): StateMessage | null {
  const { x, z, heading, activity, seatIndex, holdingBroom, beadsVisible, beadTotal } = fields;
  if (!isCoordinate(x) || !isCoordinate(z)) return null;
  if (typeof heading !== "number" || !Number.isFinite(heading)) return null;
  if (!ACTIVITIES.includes(activity as Activity)) return null;
  if (seatIndex !== null && !isIntegerIn(seatIndex, 0, SEAT_COUNT)) return null;
  if (typeof holdingBroom !== "boolean" || typeof beadsVisible !== "boolean") return null;
  if (!isIntegerIn(beadTotal, 0, Number.MAX_SAFE_INTEGER)) return null;
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
  if (text.length === 0 || text.length > MAX_CHAT_LENGTH) return null;
  return { type: "chat", text };
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
