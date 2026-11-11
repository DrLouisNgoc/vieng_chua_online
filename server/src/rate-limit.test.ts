import { describe, expect, it } from "vitest";

import { createWindowCounter } from "./rate-limit.js";

function clock() {
  let now = 0;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("window counter", () => {
  it("counts hits per key within the window", () => {
    const time = clock();
    const counter = createWindowCounter({ windowMs: 1000, now: time.now });
    expect(counter.hit("a")).toBe(1);
    expect(counter.hit("a")).toBe(2);
    expect(counter.hit("b")).toBe(1);
    expect(counter.count("a")).toBe(2);
  });

  it("starts over once the window has passed", () => {
    const time = clock();
    const counter = createWindowCounter({ windowMs: 1000, now: time.now });
    counter.hit("a");
    counter.hit("a");
    time.advance(1000);
    expect(counter.count("a")).toBe(0);
    expect(counter.hit("a")).toBe(1);
  });

  it("reports zero for a key it has never seen", () => {
    const counter = createWindowCounter({ windowMs: 1000 });
    expect(counter.count("nobody")).toBe(0);
  });

  it("forgets expired keys so memory does not grow with every ip ever seen", () => {
    const time = clock();
    const counter = createWindowCounter({ windowMs: 1000, now: time.now, maxKeys: 3 });
    for (const key of ["a", "b", "c"]) counter.hit(key);
    time.advance(1000);
    counter.hit("d");
    expect(counter.size()).toBe(1);
  });
});
