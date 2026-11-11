import { describe, it, expect } from "vitest";
import { msUntilNextBoundary } from "./bellSchedule.js";

describe("msUntilNextBoundary", () => {
  it("counts up to the next multiple of the interval", () => {
    expect(msUntilNextBoundary(1000, 200)).toBe(800);
    expect(msUntilNextBoundary(1000, 999)).toBe(1);
  });

  it("is zero right on a boundary, so the bell tolls immediately", () => {
    expect(msUntilNextBoundary(1000, 2000)).toBe(0);
    expect(msUntilNextBoundary(1000, 0)).toBe(0);
  });

  it("aligns an hourly bell to the top of the clock hour (UTC, whole-hour timezones match)", () => {
    const oneHour = 60 * 60 * 1000;
    const at12_30 = Date.UTC(2026, 10, 11, 12, 30, 0);
    const at13_00 = Date.UTC(2026, 10, 11, 13, 0, 0);
    expect(msUntilNextBoundary(oneHour, at12_30)).toBe(at13_00 - at12_30);
  });
});
