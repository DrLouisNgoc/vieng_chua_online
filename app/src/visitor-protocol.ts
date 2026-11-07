import type { Activity } from "./interaction-state";

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

export type ServerMessage =
  | { type: "presence"; count: number }
  | { type: "welcome"; id: string }
  | { type: "visitors"; visitors: VisitorView[] }
  | { type: "seat-refused"; seatIndex: number };

export const STATE_INTERVAL_MS = 100;

const ACTIVITIES: readonly Activity[] = ["idle", "walking", "seated", "greeting", "bowing", "beads"];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function rounded(state: OutgoingState): OutgoingState {
  return { ...state, x: round(state.x), z: round(state.z), heading: round(state.heading) };
}

export function encodeJoin(name: string, colorIndex: number): string {
  return JSON.stringify({ type: "join", name, colorIndex });
}

export function encodeState(state: OutgoingState): string {
  return JSON.stringify({ type: "state", ...rounded(state) });
}

function sameState(a: OutgoingState, b: OutgoingState): boolean {
  return JSON.stringify(rounded(a)) === JSON.stringify(rounded(b));
}

export function shouldSendState(
  lastSent: OutgoingState | null,
  next: OutgoingState,
  msSinceLastSend: number,
): boolean {
  if (lastSent === null) return true;
  return msSinceLastSend >= STATE_INTERVAL_MS && !sameState(lastSent, next);
}

type Fields = Record<string, unknown>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseVisitor(value: unknown): VisitorView | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Fields;
  const valid =
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    Number.isInteger(v.colorIndex) &&
    isFiniteNumber(v.x) &&
    isFiniteNumber(v.z) &&
    isFiniteNumber(v.heading) &&
    ACTIVITIES.includes(v.activity as Activity) &&
    (v.seatIndex === null || Number.isInteger(v.seatIndex)) &&
    typeof v.holdingBroom === "boolean" &&
    typeof v.beadsVisible === "boolean" &&
    Number.isInteger(v.beadTotal);
  if (!valid) return null;
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
  switch (m.type) {
    case "presence":
      return Number.isInteger(m.count) ? { type: "presence", count: m.count as number } : null;
    case "welcome":
      return typeof m.id === "string" ? { type: "welcome", id: m.id } : null;
    case "seat-refused":
      return Number.isInteger(m.seatIndex)
        ? { type: "seat-refused", seatIndex: m.seatIndex as number }
        : null;
    case "visitors": {
      if (!Array.isArray(m.visitors)) return null;
      const visitors = m.visitors
        .map(parseVisitor)
        .filter((visitor): visitor is VisitorView => visitor !== null);
      return { type: "visitors", visitors };
    }
    default:
      return null;
  }
}
