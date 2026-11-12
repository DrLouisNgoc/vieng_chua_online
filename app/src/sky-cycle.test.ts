import { describe, expect, it } from "vitest";

import { skyAt } from "./sky-cycle";

describe("skyAt", () => {
  it("keeps today's daylight look at noon", () => {
    const noon = skyAt(12);
    expect(noon.skyTop).toBe(0x9c_bc_d6);
    expect(noon.skyHorizon).toBe(0xe8_dc_c4);
    expect(noon.fog).toBe(0xe8_dc_c4);
    expect(noon.sunColor).toBe(0xff_e8_c4);
    expect(noon.sunIntensity).toBeCloseTo(2.2);
    expect(noon.hemiSky).toBe(0xdf_ea_f5);
    expect(noon.hemiGround).toBe(0x6b_5a_3e);
    expect(noon.hemiIntensity).toBeCloseTo(0.9);
    expect(noon.exposure).toBeCloseTo(1.05);
    expect(noon.night).toBe(0);
  });

  it("is night at midnight and partly at dawn", () => {
    expect(skyAt(0).night).toBe(1);
    expect(skyAt(22).night).toBe(1);
    const dawn = skyAt(6.5).night;
    expect(dawn).toBeGreaterThan(0);
    expect(dawn).toBeLessThan(1);
  });

  it("is brightest at noon, dimmer at dusk, dimmest at night", () => {
    expect(skyAt(12).sunIntensity).toBeGreaterThan(skyAt(19.5).sunIntensity);
    expect(skyAt(19.5).sunIntensity).toBeGreaterThan(skyAt(0).sunIntensity);
  });

  it("wraps smoothly across midnight and accepts any hour", () => {
    const late = skyAt(23.999);
    const early = skyAt(0);
    expect(late.sunIntensity).toBeCloseTo(early.sunIntensity, 3);
    expect(late.skyTop).toBe(early.skyTop);
    expect(skyAt(25)).toEqual(skyAt(1));
    expect(skyAt(-2)).toEqual(skyAt(22));
  });

  it("always lights from above, so shadows stay on the ground", () => {
    for (let hour = 0; hour < 24; hour += 0.5) {
      const { x, y, z } = skyAt(hour).sunDirection;
      expect(y).toBeGreaterThan(0.3);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1);
    }
  });

  it("moves the sun from east (+x) in the morning to west (-x) in the evening", () => {
    expect(skyAt(8).sunDirection.x).toBeGreaterThan(0);
    expect(skyAt(16.5).sunDirection.x).toBeLessThan(0);
  });
});
