import { describe, expect, it } from "vitest";

import { createBeatClock } from "./beat-clock";
import { createChantSession } from "./chant-session";
import { chantById, CHANTS } from "./chant-texts";

describe("chant texts", () => {
  it("has the chant the owner chose, as lines of syllables", () => {
    expect(CHANTS.map((chant) => chant.id)).toEqual(["thichca"]);
    expect(chantById("thichca").lines).toEqual([["thấy,", "thấy,", "thấy,", "thấy"]]);
    for (const chant of CHANTS) {
      expect(chant.bpm).toBeGreaterThan(40);
      for (const line of chant.lines) {
        expect(line.length).toBeGreaterThan(0);
        for (const syllable of line) expect(syllable).not.toMatch(/\s/);
      }
    }
  });
});

describe("chant session", () => {
  const text = { lines: [["a", "b"], ["c"]] };

  it("starts before the first syllable", () => {
    const session = createChantSession(text);
    expect(session.position).toEqual({ line: 0, syllable: -1 });
    expect(session.completed).toBe(0);
  });

  it("steps one syllable per beat across lines and counts each pass", () => {
    const session = createChantSession(text);
    session.beat();
    expect(session.position).toEqual({ line: 0, syllable: 0 });
    session.beat();
    expect(session.position).toEqual({ line: 0, syllable: 1 });
    session.beat();
    expect(session.position).toEqual({ line: 1, syllable: 0 });
    expect(session.completed).toBe(1);
    session.beat();
    expect(session.position).toEqual({ line: 0, syllable: 0 });
    expect(session.completed).toBe(1);
  });
});

describe("beat clock", () => {
  it("beats right away, then once per interval", () => {
    const clock = createBeatClock(60);
    expect(clock.advance(0)).toBe(1);
    expect(clock.advance(0.5)).toBe(0);
    expect(clock.advance(0.5)).toBe(1);
    expect(clock.advance(2.2)).toBe(2);
  });

  it("restarts with an immediate beat after reset", () => {
    const clock = createBeatClock(120);
    clock.advance(0);
    clock.advance(0.3);
    clock.reset();
    expect(clock.advance(0)).toBe(1);
  });
});
