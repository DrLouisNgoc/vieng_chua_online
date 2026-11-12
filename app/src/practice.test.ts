import { describe, expect, it, vi } from "vitest";

import type { BeadStore } from "./bead-counter";
import { chantById } from "./chant-texts";
import type { PracticeDeps } from "./practice";
import { createPractice } from "./practice";

function setup(overrides: Partial<PracticeDeps> = {}) {
  let isChanting = false;
  const saved = new Map<string, number>();
  const deps: PracticeDeps = {
    strike: vi.fn(),
    startChanting: vi.fn(() => {
      isChanting = true;
      return true;
    }),
    stopChanting: vi.fn(() => {
      isChanting = false;
    }),
    isChanting: () => isChanting,
    storeFor: (id): BeadStore => ({
      load: () => saved.get(id) ?? null,
      save: (total) => {
        saved.set(id, total);
      },
    }),
    onSessionChange: vi.fn(),
    ...overrides,
  };
  return {
    practice: createPractice(deps),
    deps,
    saved,
    setChanting: (isNow: boolean) => {
      isChanting = isNow;
    },
  };
}

describe("practice: chanting", () => {
  it("starts on the chosen chant and strikes the moktak each syllable", () => {
    const { practice, deps } = setup();
    practice.selectChant("thichca");
    practice.toggleChant();
    expect(deps.startChanting).toHaveBeenCalled();
    practice.update(0);
    expect(deps.strike).toHaveBeenCalledTimes(1);
    expect(practice.view.syllable).toBe(0);
    expect(practice.view.line).toEqual(chantById("thichca").lines[0]);
    practice.update(60 / chantById("thichca").bpm);
    expect(deps.strike).toHaveBeenCalledTimes(2);
  });

  it("counts each completed pass and keeps it per chant", () => {
    const { practice, saved } = setup();
    practice.selectChant("thichca");
    practice.toggleChant();
    const beat = 60 / chantById("thichca").bpm;
    practice.update(0);
    for (let i = 0; i < 5; i += 1) practice.update(beat);
    expect(practice.view.count).toBe(1);
    expect(saved.get("thichca")).toBe(1);
  });

  it("does not start when the avatar cannot chant (e.g. holding the broom)", () => {
    const { practice } = setup({ startChanting: () => false });
    practice.toggleChant();
    expect(practice.view.chanting).toBe(false);
  });

  it("ends when the avatar moves, and on a second toggle", () => {
    const { practice, deps, setChanting } = setup();
    practice.toggleChant();
    setChanting(false);
    practice.update(0.1);
    expect(practice.view.chanting).toBe(false);
    practice.toggleChant();
    practice.toggleChant();
    expect(deps.stopChanting).toHaveBeenCalled();
    expect(practice.view.chanting).toBe(false);
  });

  it("reports session start and end (for the singing bowl)", () => {
    const { practice, deps } = setup();
    practice.toggleChant();
    practice.toggleChant();
    expect(deps.onSessionChange).toHaveBeenNthCalledWith(1, true);
    expect(deps.onSessionChange).toHaveBeenNthCalledWith(2, false);
  });
});

describe("practice: moktak autoplay", () => {
  it("strikes once a second until turned off", () => {
    const { practice, deps } = setup();
    practice.toggleAutoplay();
    practice.update(0);
    practice.update(1);
    practice.update(1);
    expect(deps.strike).toHaveBeenCalledTimes(3);
    practice.toggleAutoplay();
    practice.update(5);
    expect(deps.strike).toHaveBeenCalledTimes(3);
  });

  it("gives way to chanting, which keeps its own beat", () => {
    const { practice } = setup();
    practice.toggleAutoplay();
    practice.toggleChant();
    expect(practice.view.autoplay).toBe(false);
  });
});
