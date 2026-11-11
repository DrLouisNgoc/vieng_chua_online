import type { InteractionSnapshot } from "./interaction-state";
import type { Targets } from "./interaction-targets";
import { BEADS_PER_ROUND } from "./bead-counter";

export type InteractionAction = "sit" | "bow" | "takeBroom" | "leaveBroom" | "greet" | "bead" | "ringBell";

export type InteractionKey = "E" | "Q" | "B";

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
};

export const ACTION_KEYS: Record<InteractionAction, InteractionKey> = {
  sit: "E",
  bow: "E",
  takeBroom: "E",
  leaveBroom: "E",
  greet: "Q",
  bead: "B",
  ringBell: "E",
};

export function beadCounterText(round: number, total: number): string {
  return `Hạt ${round}/${BEADS_PER_ROUND} · tổng ${total}`;
}

// E carries one context action, by priority: broom > bell > bow > sit.
function contextAction(snapshot: InteractionSnapshot, targets: Targets): InteractionAction | null {
  const seated = snapshot.seatIndex !== null;
  if (snapshot.holdingBroom) return targets.nearBroom ? "leaveBroom" : null;
  if (targets.nearBroom && !seated) return "takeBroom";
  if (targets.nearBell && !seated) return "ringBell";
  if (seated || targets.inStatueZone) return "bow";
  if (targets.seatIndex !== null) return "sit";
  return null;
}

export function promptsFor(snapshot: InteractionSnapshot, targets: Targets): Prompt[] {
  const atRest = snapshot.activity === "idle" || snapshot.activity === "seated" || snapshot.activity === "beads";
  if (!atRest) return [];

  const offered: InteractionAction[] = [];
  const context = contextAction(snapshot, targets);
  if (context) offered.push(context);
  // Both hands are on the broom while holding it.
  if (!snapshot.holdingBroom) offered.push("greet", "bead");

  return offered.map((action) => ({
    action,
    key: ACTION_KEYS[action],
    label: INTERACTION_TEXT[action],
  }));
}
