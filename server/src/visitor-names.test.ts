import { describe, expect, it } from "vitest";

import { createVisitorNameStore, DEFAULT_NAME, isDefaultName } from "./visitor-names.js";

describe("isDefaultName", () => {
  it("matches the forbidden default name exactly", () => {
    expect(isDefaultName("Thiện Tâm")).toBe(true);
  });

  it("matches regardless of case, spacing or diacritics", () => {
    expect(isDefaultName("  thien tam  ")).toBe(true);
    expect(isDefaultName("THIỆN TÂM")).toBe(true);
  });

  it("does not match a real pháp danh", () => {
    expect(isDefaultName("Diệu Tâm")).toBe(false);
  });

  it("exports the exact default name string", () => {
    expect(DEFAULT_NAME).toBe("Thiện Tâm");
  });
});

describe("createVisitorNameStore", () => {
  it("has no name for an ip that never registered", () => {
    const store = createVisitorNameStore(null);
    expect(store.nameFor("192.0.2.1")).toBeNull();
  });

  it("remembers the name registered for an ip", () => {
    const store = createVisitorNameStore(null);
    store.register("192.0.2.1", "Diệu Tâm");
    expect(store.nameFor("192.0.2.1")).toBe("Diệu Tâm");
  });

  it("overwrites a previous name for the same ip (caller enforces first-write-wins)", () => {
    const store = createVisitorNameStore(null);
    store.register("192.0.2.1", "Diệu Tâm");
    store.register("192.0.2.1", "Khác Tên");
    expect(store.nameFor("192.0.2.1")).toBe("Khác Tên");
  });

  it("restores names from a seed object (persisted file)", () => {
    const store = createVisitorNameStore({ "192.0.2.1": "Diệu Tâm" });
    expect(store.nameFor("192.0.2.1")).toBe("Diệu Tâm");
  });

  it("ignores a malformed seed instead of throwing", () => {
    expect(() => createVisitorNameStore("not an object")).not.toThrow();
    expect(() => createVisitorNameStore(["array"])).not.toThrow();
    expect(createVisitorNameStore("nope").nameFor("x")).toBeNull();
  });

  it("snapshot() returns every registered ip/name pair", () => {
    const store = createVisitorNameStore(null);
    store.register("192.0.2.1", "Diệu Tâm");
    store.register("198.51.100.7", "An");
    expect(store.snapshot()).toEqual({ "192.0.2.1": "Diệu Tâm", "198.51.100.7": "An" });
  });
});
