import { describe, expect, it } from "vitest";

import { msUntilNextBoundary } from "./bell-schedule.js";

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
    const at1230 = Date.UTC(2026, 10, 11, 12, 30, 0);
    const at1300 = Date.UTC(2026, 10, 11, 13, 0, 0);
    expect(msUntilNextBoundary(oneHour, at1230)).toBe(at1300 - at1230);
  });
});
