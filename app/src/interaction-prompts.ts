import { BEADS_PER_ROUND } from "./bead-counter";
import type { InteractionSnapshot } from "./interaction-state";
import type { Targets } from "./interaction-targets";

export type InteractionAction = "sit" | "bow" | "takeBroom" | "leaveBroom" | "greet" | "bead" | "ringBell" | "incense";

export type InteractionKey = "E" | "Q" | "B" | "H";

export interface Prompt {
  action: InteractionAction;
  key: InteractionKey;
  label: string;
}

// Vietnamese literals: i18n.ts is keyed by the original Korean strings,
// which were never captured for these actions (design.md ruling).
export const INTERACTION_TEXT: Record<InteractionAction, string> = {
  sit: "Ngồi thiền",
  bow: "Lạy Phật",
  takeBroom: "Cầm chổi",
  leaveBroom: "Dựng chổi",
  greet: "Chắp tay",
  bead: "Lần hạt",
  ringBell: "Thỉnh chuông",
  incense: "Thắp hương",
};

export const ACTION_KEYS: Record<InteractionAction, InteractionKey> = {
  sit: "E",
  bow: "E",
  takeBroom: "E",
  leaveBroom: "E",
  greet: "Q",
  bead: "B",
  ringBell: "E",
  incense: "H",
};

export function beadCounterText(round: number, total: number): string {
  return `Hạt ${String(round)}/${String(BEADS_PER_ROUND)} · tổng ${String(total)}`;
}

// E carries one context action, by priority: broom > bell > bow > sit.
function contextAction(snapshot: InteractionSnapshot, targets: Targets): InteractionAction | null {
  if (snapshot.holdingBroom) return targets.nearBroom ? "leaveBroom" : null;
  const isSeated = snapshot.seatIndex !== null;
  if (!isSeated && targets.nearBroom) return "takeBroom";
  if (!isSeated && targets.nearBell) return "ringBell";
  if (isSeated || targets.inStatueZone) return "bow";
  if (targets.seatIndex !== null) return "sit";
  return null;
}

export function promptsFor(snapshot: InteractionSnapshot, targets: Targets): Prompt[] {
  const isAtRest = snapshot.activity === "idle" || snapshot.activity === "seated" || snapshot.activity === "beads";
  if (!isAtRest) return [];

  const offered: InteractionAction[] = [];
  const context = contextAction(snapshot, targets);
  if (context !== null) offered.push(context);
  // Incense needs both hands, like the greeting and the beads.
  if (!snapshot.holdingBroom && targets.incenseIndex !== null) offered.push("incense");
  // Both hands are on the broom while holding it.
  if (!snapshot.holdingBroom) offered.push("greet", "bead");

  return offered.map((action) => ({
    action,
    key: ACTION_KEYS[action],
    label: INTERACTION_TEXT[action],
  }));
}
