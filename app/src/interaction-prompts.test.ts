import { describe, expect, it } from "vitest";

import { beadCounterText, INTERACTION_TEXT, promptsFor } from "./interaction-prompts";
import type { InteractionSnapshot } from "./interaction-state";
import type { Targets } from "./interaction-targets";

const idle: InteractionSnapshot = {
  activity: "idle",
  seatIndex: null,
  holdingBroom: false,
  beadsVisible: false,
};
const nowhere: Targets = {
  seatIndex: null,
  nearBroom: false,
  nearBell: false,
  inStatueZone: false,
  incenseIndex: null,
};

function actions(snapshot: InteractionSnapshot, targets: Targets): string[] {
  return promptsFor(snapshot, targets).map((prompt) => prompt.action);
}

describe("promptsFor", () => {
  it("offers greeting and beads anywhere at rest", () => {
    expect(actions(idle, nowhere)).toEqual(["greet", "bead"]);
  });

  it("offers nothing while walking, greeting or bowing", () => {
    for (const activity of ["walking", "greeting", "bowing"] as const) {
      expect(actions({ ...idle, activity }, { ...nowhere, seatIndex: 2 })).toEqual([]);
    }
  });

  it("offers sitting near a free seat", () => {
    expect(actions(idle, { ...nowhere, seatIndex: 2 })).toEqual(["sit", "greet", "bead"]);
  });

  it("offers bowing in the statue zone or seated, over sitting", () => {
    expect(actions(idle, { ...nowhere, inStatueZone: true, seatIndex: 1 })[0]).toBe("bow");
    const seated = { ...idle, activity: "seated" as const, seatIndex: 1 };
    expect(actions(seated, { ...nowhere, seatIndex: 1 })).toEqual(["bow", "greet", "bead"]);
  });

  it("puts the broom first, and nothing else while holding it", () => {
    expect(actions(idle, { ...nowhere, nearBroom: true, seatIndex: 1 })[0]).toBe("takeBroom");
    const holding = { ...idle, holdingBroom: true };
    expect(actions(holding, { ...nowhere, nearBroom: true })).toEqual(["leaveBroom"]);
    expect(actions(holding, { ...nowhere, seatIndex: 1, inStatueZone: true })).toEqual([]);
  });

  it("does not offer the broom while seated", () => {
    const seated = { ...idle, activity: "seated" as const, seatIndex: 1 };
    expect(actions(seated, { ...nowhere, nearBroom: true })[0]).toBe("bow");
  });

  it("maps E, Q and B keys with Vietnamese labels", () => {
    const prompts = promptsFor(idle, { ...nowhere, seatIndex: 0 });
    expect(prompts).toEqual([
      { action: "sit", key: "E", label: INTERACTION_TEXT.sit },
      { action: "greet", key: "Q", label: INTERACTION_TEXT.greet },
      { action: "bead", key: "B", label: INTERACTION_TEXT.bead },
    ]);
    expect(INTERACTION_TEXT.sit).toBe("Ngồi thiền");
  });
});

describe("bell and chanting prompts", () => {
  const nearBell = { ...nowhere, nearBell: true };

  it("offers ringing the bell over bowing and sitting, not with the broom", () => {
    expect(actions(idle, { ...nearBell, inStatueZone: true, seatIndex: 1 })[0]).toBe("ringBell");
    expect(actions({ ...idle, holdingBroom: true }, nearBell)).toEqual([]);
    expect(promptsFor(idle, nearBell)[0]).toEqual({ action: "ringBell", key: "E", label: "Thỉnh chuông" });
  });

  it("offers nothing while chanting", () => {
    expect(actions({ ...idle, activity: "chanting" }, { ...nearBell, seatIndex: 1 })).toEqual([]);
  });
});

describe("beadCounterText", () => {
  it("shows the bead within the round and the total", () => {
    expect(beadCounterText(12, 1093)).toBe("Hạt 12/108 · tổng 1093");
  });
});

describe("incense (key H)", () => {
  it("is offered near an incense urn, between the context action and the greeting and beads", () => {
    const list = promptsFor(idle, { ...nowhere, incenseIndex: 1, inStatueZone: true });
    expect(list.map((prompt) => prompt.action)).toEqual(["bow", "incense", "greet", "bead"]);
    const incense = list.find((prompt) => prompt.action === "incense");
    expect(incense?.key).toBe("H");
    expect(incense?.label).toBe("Thắp hương");
  });

  it("is not offered away from an urn, while holding the broom, or mid-action", () => {
    expect(actions(idle, nowhere)).not.toContain("incense");
    expect(actions({ ...idle, holdingBroom: true }, { ...nowhere, incenseIndex: 0 })).not.toContain("incense");
    expect(promptsFor({ ...idle, activity: "bowing" }, { ...nowhere, incenseIndex: 0 })).toEqual([]);
  });
});
