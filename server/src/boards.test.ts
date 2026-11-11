import { describe, expect, it } from "vitest";

import { BOARD_SEEDS, createBoardStore, seedBoards } from "./boards.js";

const fixedSeed = { id: "a", title: "Cốc A", type: "text" as const, registrable: false };
const openSeed = { id: "o", title: "Cốc Trống", type: "text" as const, registrable: true };

describe("createBoardStore: fixed (non-registrable) boards", () => {
  it("lists seeded boards with empty body and no password exposed", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.list()).toEqual([
      {
        id: "a",
        title: "Cốc A",
        type: "text",
        body: "",
        talks: "",
        registrable: false,
        requiresPassword: true,
        occupantName: null,
        pendingName: null,
        answeredQuestions: [],
      },
    ]);
  });

  it("returns undefined for an unknown board", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.get("nope")).toBeUndefined();
  });

  it("reports not-found when editing an unknown board", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.edit("nope", "x", { body: "y" })).toBe("not-found");
  });

  it("the first edit sets the password and the body", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.edit("a", "bimat123", { body: "Xin chào" })).toBe("ok");
    expect(store.get("a")?.body).toBe("Xin chào");
  });

  it("accepts further edits with the same password", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", { body: "Xin chào" });
    expect(store.edit("a", "bimat123", { body: "Cập nhật" })).toBe("ok");
    expect(store.get("a")?.body).toBe("Cập nhật");
  });

  it("rejects an edit with the wrong password and keeps the body unchanged", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", { body: "Xin chào" });
    expect(store.edit("a", "wrong", { body: "Hack" })).toBe("wrong-password");
    expect(store.get("a")?.body).toBe("Xin chào");
  });

  it("edit can also set the talks field, with the same password", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", { body: "Xin chào", talks: "Vô thường | https://youtu.be/abc" });
    expect(store.get("a")).toMatchObject({ body: "Xin chào", talks: "Vô thường | https://youtu.be/abc" });
    expect(store.edit("a", "bimat123", { body: "Xin chào 2" })).toBe("ok");
    expect(store.get("a")?.talks).toBe("Vô thường | https://youtu.be/abc");
  });

  it("edit can rename the board, keeping the old name if left blank", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", { body: "Xin chào", title: "Cốc Mới" });
    expect(store.get("a")?.title).toBe("Cốc Mới");
    store.edit("a", "bimat123", { body: "Xin chào 2", title: " ".repeat(3) });
    expect(store.get("a")?.title).toBe("Cốc Mới");
  });

  it("ask requires no password and leaves a private question", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.ask("a", "Khách", "Thưa thầy, làm sao để bớt lo âu?")).toBe("ok");
    expect(store.get("a")).not.toHaveProperty("questions");
  });

  it("readQuestions needs the board's password and never the plain one", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.ask("a", "Khách", "Câu hỏi 1");
    expect(store.readQuestions("a", "anything")).toEqual({ outcome: "wrong-password" });
    store.edit("a", "bimat123", { body: "Xin chào" });
    expect(store.readQuestions("a", "wrong")).toEqual({ outcome: "wrong-password" });
    const result = store.readQuestions("a", "bimat123");
    if (result.outcome !== "ok") throw new Error("expected ok");
    expect(result.questions).toMatchObject([{ name: "Khách", text: "Câu hỏi 1", answer: null }]);
    expect(typeof result.questions[0]?.id).toBe("string");
  });

  it("ask reports not-found for an unknown board", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    expect(store.ask("nope", "Khách", "x")).toBe("not-found");
  });

  it("ask reports not-assigned for an open cốc with no occupant yet", () => {
    const store = createBoardStore(seedBoards([openSeed]));
    expect(store.ask("o", "Khách", "x")).toBe("not-assigned");
  });

  it("never exposes the password hash through list/get", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", { body: "Xin chào" });
    expect(store.get("a")).not.toHaveProperty("passwordHash");
    expect(store.list()[0]).not.toHaveProperty("passwordHash");
  });

  it("snapshot carries the password hash for persistence, not the plain password", () => {
    const store = createBoardStore(seedBoards([fixedSeed]));
    store.edit("a", "bimat123", { body: "Xin chào" });
    const [snap] = store.snapshot();
    expect(snap.passwordHash).toBeTruthy();
    expect(snap.passwordHash).not.toBe("bimat123");
  });
});

describe("createBoardStore: open (registrable) cốc", () => {
  it("cannot be edited before anyone is assigned", () => {
    const store = createBoardStore(seedBoards([openSeed]));
    expect(store.edit("o", "whatever", { body: "nội dung" })).toBe("not-assigned");
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
    expect(store.edit("o", "mkpass", { body: "Bài pháp đầu tiên" })).toBe("ok");
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
    expect(store.listPending()).toEqual([{ id: "o", title: "Cốc Trống", name: "Chú Tâm", note: "ghi chú riêng" }]);
  });
});

describe("BOARD_SEEDS", () => {
  it("has the 4 named cốc, the hall projector, 4 open cốc, the chánh điện quote banner and the kinh board, each with a unique id", () => {
    expect(BOARD_SEEDS).toHaveLength(11);
    expect(new Set(BOARD_SEEDS.map((b) => b.id)).size).toBe(11);
    expect(BOARD_SEEDS.filter((b) => b.registrable)).toHaveLength(4);
  });

  it("only the hall projector skips a password", () => {
    expect(BOARD_SEEDS.filter((b) => b.requiresPassword === false).map((b) => b.id)).toEqual(["may-chieu-chanh-dien"]);
  });
});
