import { describe, expect, it, vi } from "vitest";

import { createMoktakController } from "./moktak";

describe("createMoktakController", () => {
  it("starts with zero strikes", () => {
    const controller = createMoktakController({ onStrike: vi.fn() });
    expect(controller.strikeCount).toBe(0);
  });

  it("strike() calls onStrike and increments strikeCount", () => {
    const onStrike = vi.fn();
    const controller = createMoktakController({ onStrike });
    controller.strike();
    controller.strike();
    expect(onStrike).toHaveBeenCalledTimes(2);
    expect(controller.strikeCount).toBe(2);
  });
});
