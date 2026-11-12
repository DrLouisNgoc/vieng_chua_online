import { describe, expect, it } from "vitest";

import { createKeyState } from "./key-state";

describe("createKeyState", () => {
  it("tracks a held key until it is released", () => {
    const keys = createKeyState();
    keys.down("KeyW");
    expect(keys.isAnyHeld(["KeyW", "ArrowUp"])).toBe(true);
    keys.up("KeyW");
    expect(keys.isAnyHeld(["KeyW", "ArrowUp"])).toBe(false);
  });

  it("clear() releases everything (focus lost, so the matching keyup never arrives)", () => {
    const keys = createKeyState();
    keys.down("KeyW");
    keys.down("KeyA");
    keys.clear();
    expect(keys.isAnyHeld(["KeyW", "KeyA"])).toBe(false);
  });

  it("repeated keydown from OS auto-repeat does not need extra keyups", () => {
    const keys = createKeyState();
    keys.down("KeyW");
    keys.down("KeyW");
    keys.down("KeyW");
    keys.up("KeyW");
    expect(keys.isAnyHeld(["KeyW"])).toBe(false);
  });
});
