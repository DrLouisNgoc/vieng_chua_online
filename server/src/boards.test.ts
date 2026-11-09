import { describe, it, expect } from "vitest";
import { BOARD_SEEDS, createBoardStore, mergeWithSeed, seedBoards } from "./boards.js";

const fixedSeed = { id: "a", title: "Cốc A", type: "text" as const, registrable: false };
const openSeed = { id: "o", title: "Cốc Trống", type: "text" as const, registrable: true };

describe("createBoardStore: fixed (non-registrable) boards", () => {
  it("lists seeded boards with empty body and no password exposed", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.list()).toEqual([
      { id: "a", title: "Cốc A", type: "text", body: "", registrable: false, occupantName: null, pendingName: null },
    ]);
  });

  it("returns undefined for an unknown board", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.get("nope")).toBeUndefined();
  });

  it("reports not-found when editing an unknown board", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.edit("nope", "x", "y")).toBe("not-found");
  });

  it("the first edit sets the password and the body", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.edit("a", "bimat123", "Xin chào")).toBe("ok");
    expect(store.get("a")?.body).toBe("Xin chào");
  });

  it("accepts further edits with the same password", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", "Xin chào");
    expect(store.edit("a", "bimat123", "Cập nhật")).toBe("ok");
    expect(store.get("a")?.body).toBe("Cập nhật");
  });

  it("rejects an edit with the wrong password and keeps the body unchanged", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", "Xin chào");
    expect(store.edit("a", "wrong", "Hack")).toBe("wrong-password");
    expect(store.get("a")?.body).toBe("Xin chào");
  });

  it("never exposes the password hash through list/get", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", "Xin chào");
    expect(store.get("a")).not.toHaveProperty("passwordHash");
    expect(store.list()[0]).not.toHaveProperty("passwordHash");
  });

  it("snapshot carries the password hash for persistence, not the plain password", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", "Xin chào");
    const [snap] = store.snapshot();
    expect(snap?.passwordHash).toBeTruthy();
    expect(snap?.passwordHash).not.toBe("bimat123");
  });
});

describe("createBoardStore: open (registrable) cốc", () => {
  it("cannot be edited before anyone is assigned", () => {
    const store = createBoardStore(seedBoards([openSeed]));
    expect(store.edit("o", "whatever", "nội dung")).toBe("not-assigned");
  });

  it("accepts a registration, visible publicly as pendingName", () => {
    const store = createBoardStore(seedBoards([openSeed]));
    expect(store.register("o", "Chú Tâm", "Muốn chia sẻ về vô thường")).toBe("ok");
    expect(store.get("o")).toMatchObject({ pendingName: "Chú Tâm", occupantName: null });
  });

  it("refuses a second registration while one is pending", () => {
    const store = createBoardStore(seedBoards([openSeed]));
    store.register("o", "Chú Tâm", "note");
    expect(store.register("o", "Khác", "note khác")).toBe("already-pending");
  });

  it("refuses registering a non-registrable board", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.register("a", "Ai đó", "note")).toBe("not-registrable");
  });

  it("approve assigns the occupant and clears pending; board becomes editable", () => {
    const store = createBoardStore(seedBoards([openSeed]));
    store.register("o", "Chú Tâm", "note");
    expect(store.approve("o")).toBe("ok");
    expect(store.get("o")).toMatchObject({ occupantName: "Chú Tâm", pendingName: null });
    expect(store.edit("o", "mkpass", "Bài pháp đầu tiên")).toBe("ok");
  });

  it("approve with nothing pending reports no-pending", () => {
    const store = createBoardStore(seedBoards([openSeed]));
    expect(store.approve("o")).toBe("no-pending");
  });

  it("reject clears pending back to empty, open for a new registration", () => {
    const store = createBoardStore(seedBoards([openSeed]));
    store.register("o", "Chú Tâm", "note");
    expect(store.reject("o")).toBe("ok");
    expect(store.get("o")).toMatchObject({ occupantName: null, pendingName: null });
    expect(store.register("o", "Khác", "note khác")).toBe("ok");
  });

  it("refuses registering a board that is already assigned", () => {
    const store = createBoardStore(seedBoards([openSeed]));
    store.register("o", "Chú Tâm", "note");
    store.approve("o");
    expect(store.register("o", "Khác", "note khác")).toBe("already-assigned");
  });

  it("listPending reports every board with a pending registration, note included", () => {
    const store = createBoardStore(seedBoards([openSeed, { ...openSeed, id: "o2", title: "Cốc Trống 2" }]));
    store.register("o", "Chú Tâm", "ghi chú riêng");
    expect(store.listPending()).toEqual([
      { id: "o", title: "Cốc Trống", name: "Chú Tâm", note: "ghi chú riêng" },
    ]);
  });
});

describe("mergeWithSeed", () => {
  it("keeps persisted body/password/occupant but adopts the seed's title/type", () => {
    const persisted = [
      {
        id: "a",
        title: "old title",
        type: "text" as const,
        body: "Nội dung cũ",
        passwordHash: "s:h",
        registrable: false,
        occupantName: null,
        pending: null,
      },
    ];
    const merged = mergeWithSeed(persisted, [fixedSeed]);
    expect(merged).toEqual([
      {
        id: "a",
        title: "Cốc A",
        type: "text",
        body: "Nội dung cũ",
        passwordHash: "s:h",
        registrable: false,
        occupantName: null,
        pending: null,
      },
    ]);
  });

  it("adds a fresh board for a seed id missing from persisted data", () => {
    const merged = mergeWithSeed([], [fixedSeed]);
    expect(merged).toEqual([
      { id: "a", title: "Cốc A", type: "text", registrable: false, body: "", passwordHash: null, occupantName: null, pending: null },
    ]);
  });

  it("drops a persisted board whose id is no longer in the seed list", () => {
    const persisted = [
      { id: "old", title: "Old", type: "text" as const, body: "x", passwordHash: null, registrable: false, occupantName: null, pending: null },
    ];
    const merged = mergeWithSeed(persisted, [fixedSeed]);
    expect(merged.map((b) => b.id)).toEqual(["a"]);
  });

  it("falls back to the seed list when given non-array/invalid persisted data", () => {
    expect(mergeWithSeed(null, [fixedSeed])).toEqual([
      { id: "a", title: "Cốc A", type: "text", registrable: false, body: "", passwordHash: null, occupantName: null, pending: null },
    ]);
  });
});

describe("BOARD_SEEDS", () => {
  it("has the 4 named cốc, the hall projector and 4 open cốc, each with a unique id", () => {
    expect(BOARD_SEEDS).toHaveLength(9);
    expect(new Set(BOARD_SEEDS.map((b) => b.id)).size).toBe(9);
    expect(BOARD_SEEDS.filter((b) => b.registrable)).toHaveLength(4);
  });
});
