import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMoktakController } from "./moktak";

describe("createMoktakController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with zero strikes and autoplay off", () => {
    const controller = createMoktakController({ onStrike: vi.fn() });
    expect(controller.strikeCount).toBe(0);
    expect(controller.isAutoplay).toBe(false);
  });

  it("strike() calls onStrike and increments strikeCount", () => {
    const onStrike = vi.fn();
    const controller = createMoktakController({ onStrike });
    controller.strike();
    controller.strike();
    expect(onStrike).toHaveBeenCalledTimes(2);
    expect(controller.strikeCount).toBe(2);
  });

  it("toggleAutoplay() turns autoplay on and strikes on an interval", () => {
    const onStrike = vi.fn();
    const controller = createMoktakController({
      onStrike,
      autoplayIntervalMs: 1000,
    });

    controller.toggleAutoplay();
    expect(controller.isAutoplay).toBe(true);
    expect(onStrike).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onStrike).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    expect(onStrike).toHaveBeenCalledTimes(3);
  });

  it("toggleAutoplay() a second time turns it back off and stops striking", () => {
    const onStrike = vi.fn();
    const controller = createMoktakController({
      onStrike,
      autoplayIntervalMs: 1000,
    });

    controller.toggleAutoplay();
    vi.advanceTimersByTime(1000);
    expect(onStrike).toHaveBeenCalledTimes(1);

    controller.toggleAutoplay();
    expect(controller.isAutoplay).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(onStrike).toHaveBeenCalledTimes(1);
  });

  it("dispose() stops a running autoplay interval", () => {
    const onStrike = vi.fn();
    const controller = createMoktakController({
      onStrike,
      autoplayIntervalMs: 1000,
    });
    controller.toggleAutoplay();
    controller.dispose();

    vi.advanceTimersByTime(5000);
    expect(onStrike).not.toHaveBeenCalled();
  });

  it("manual strike() while autoplay is on still counts and does not reset the interval", () => {
    const onStrike = vi.fn();
    const controller = createMoktakController({
      onStrike,
      autoplayIntervalMs: 1000,
    });
    controller.toggleAutoplay();
    vi.advanceTimersByTime(500);
    controller.strike();
    expect(controller.strikeCount).toBe(1);

    vi.advanceTimersByTime(500);
    expect(onStrike).toHaveBeenCalledTimes(2);
  });
});
