import { describe, it, expect, vi } from "vitest";
import { BEADS_PER_ROUND, createBeadCounter, createStorageBeadStore, type BeadStore } from "./bead-counter";

function memoryStore(initial: number | null = null): BeadStore & { saved: number[] } {
  const saved: number[] = [];
  return { saved, load: () => initial, save: (total) => saved.push(total) };
}

describe("createBeadCounter", () => {
  it("starts at bead 0 with the stored total", () => {
    const counter = createBeadCounter(memoryStore(250));
    expect(counter.total).toBe(250);
    expect(counter.round).toBe(250 % BEADS_PER_ROUND);
  });

  it("counts 1..108 then starts the round again, saving each turn", () => {
    const store = memoryStore();
    const counter = createBeadCounter(store);
    expect(counter.round).toBe(0);
    for (let i = 0; i < BEADS_PER_ROUND; i += 1) counter.turn();
    expect(counter.round).toBe(108);
    counter.turn();
    expect(counter.round).toBe(1);
    expect(counter.total).toBe(109);
    expect(store.saved.at(-1)).toBe(109);
  });
});

describe("createStorageBeadStore", () => {
  it("round-trips the total through a Storage", () => {
    const backing = new Map<string, string>();
    const storage = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => void backing.set(key, value),
    };
    const store = createStorageBeadStore(storage, "k");
    expect(store.load()).toBeNull();
    store.save(42);
    expect(store.load()).toBe(42);
  });

  it("ignores garbage and survives a throwing storage", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const garbage = createStorageBeadStore({ getItem: () => "abc", setItem: () => {} }, "k");
    expect(garbage.load()).toBeNull();

    const broken = createStorageBeadStore(
      {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("full");
        },
      },
      "k",
    );
    expect(broken.load()).toBeNull();
    expect(() => broken.save(3)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
