import type { Activity } from "../../shared/protocol";
import { ACTIVITIES } from "../../shared/protocol";

export { MAX_CHAT_LENGTH } from "../../shared/protocol";

// Client side of the visitor protocol (server/src/protocol.ts is the
// server side; docs/specs/milestone-6-visitors/design.md). Messages from
// the server are validated too: one bad entry must not break the scene.

export interface OutgoingState {
  x: number;
  z: number;
  heading: number;
  activity: Activity;
  seatIndex: number | null;
  holdingBroom: boolean;
  beadsVisible: boolean;
  beadTotal: number;
}

export interface VisitorView extends OutgoingState {
  id: string;
  name: string;
  colorIndex: number;
}

export interface ChatEntry {
  id: string;
  name: string;
  text: string;
  ts: number;
}

export type ServerMessage =
  | { type: "presence"; count: number }
  | { type: "welcome"; id: string }
  | { type: "visitors"; visitors: VisitorView[] }
  | { type: "seat-refused"; seatIndex: number }
  | { type: "chat"; message: ChatEntry }
  | { type: "chat-history"; messages: ChatEntry[] }
  | { type: "bell" }
  | { type: "name-lock"; name: string | null }
  | { type: "join-refused"; reason: "default-name" };

export const STATE_INTERVAL_MS = 100;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function rounded(state: OutgoingState): OutgoingState {
  return { ...state, x: round(state.x), z: round(state.z), heading: round(state.heading) };
}

export function encodeJoin(name: string, colorIndex: number): string {
  return JSON.stringify({ type: "join", name, colorIndex });
}

export function encodeChat(text: string): string {
  return JSON.stringify({ type: "chat", text });
}

export function encodeState(state: OutgoingState): string {
  return JSON.stringify({ type: "state", ...rounded(state) });
}

function isSameState(a: OutgoingState, b: OutgoingState): boolean {
  return JSON.stringify(rounded(a)) === JSON.stringify(rounded(b));
}

export function shouldSendState(lastSent: OutgoingState | null, next: OutgoingState, msSinceLastSend: number): boolean {
  return lastSent === null || (msSinceLastSend >= STATE_INTERVAL_MS && !isSameState(lastSent, next));
}

type Fields = Record<string, unknown>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseChatEntry(value: unknown): ChatEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Fields;
  return typeof v.id === "string" && typeof v.name === "string" && typeof v.text === "string" && Number.isFinite(v.ts)
    ? { id: v.id, name: v.name, text: v.text, ts: v.ts as number }
    : null;
}

function parseVisitor(value: unknown): VisitorView | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Fields;
  const isValid =
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    Number.isSafeInteger(v.colorIndex) &&
    isFiniteNumber(v.x) &&
    isFiniteNumber(v.z) &&
    isFiniteNumber(v.heading) &&
    ACTIVITIES.includes(v.activity as Activity) &&
    (v.seatIndex === null || Number.isSafeInteger(v.seatIndex)) &&
    typeof v.holdingBroom === "boolean" &&
    typeof v.beadsVisible === "boolean" &&
    Number.isSafeInteger(v.beadTotal);
  if (!isValid) return null;
  return {
    id: v.id as string,
    name: v.name as string,
    colorIndex: v.colorIndex as number,
    x: v.x as number,
    z: v.z as number,
    heading: v.heading as number,
    activity: v.activity as Activity,
    seatIndex: v.seatIndex as number | null,
    holdingBroom: v.holdingBroom as boolean,
    beadsVisible: v.beadsVisible as boolean,
    beadTotal: v.beadTotal as number,
  };
}

function parseList<T>(items: unknown, parseItem: (item: unknown) => T | null): T[] | null {
  return Array.isArray(items) ? items.map((item) => parseItem(item)).filter((item): item is T => item !== null) : null;
}

function parseVisitors(m: Fields): ServerMessage | null {
  const visitors = parseList(m.visitors, parseVisitor);
  return visitors ? { type: "visitors", visitors } : null;
}

function parseChatHistory(m: Fields): ServerMessage | null {
  const messages = parseList(m.messages, parseChatEntry);
  return messages ? { type: "chat-history", messages } : null;
}

function parseChat(m: Fields): ServerMessage | null {
  const message = parseChatEntry(m.message);
  return message ? { type: "chat", message } : null;
}

// One parser per message type. A Map, so an unknown type such as
// "toString" finds nothing instead of an Object.prototype method.
const MESSAGE_PARSERS = new Map<unknown, (m: Fields) => ServerMessage | null>([
  ["presence", (m) => (Number.isSafeInteger(m.count) ? { type: "presence", count: m.count as number } : null)],
  ["welcome", (m) => (typeof m.id === "string" ? { type: "welcome", id: m.id } : null)],
  ["bell", () => ({ type: "bell" })],
  ["name-lock", (m) => (typeof m.name === "string" || m.name === null ? { type: "name-lock", name: m.name } : null)],
  ["join-refused", (m) => (m.reason === "default-name" ? { type: "join-refused", reason: "default-name" } : null)],
  [
    "seat-refused",
    (m) => (Number.isSafeInteger(m.seatIndex) ? { type: "seat-refused", seatIndex: m.seatIndex as number } : null),
  ],
  ["visitors", parseVisitors],
  ["chat", parseChat],
  ["chat-history", parseChatHistory],
]);

export function parseServerMessage(text: string): ServerMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    // not one of ours; ignore like any other unknown message
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const m = value as Fields;
  return MESSAGE_PARSERS.get(m.type)?.(m) ?? null;
}
