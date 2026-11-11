import { describe, expect, it } from "vitest";

import { createBoardStore, seedBoards } from "./boards.js";
import { mergeWithSeed } from "./boards-persisted.js";

const fixedSeed = { id: "a", title: "Cốc A", type: "text" as const, registrable: false };

describe("mergeWithSeed", () => {
  it("keeps persisted body/title/password/occupant but adopts the seed's type", () => {
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
        title: "old title",
        type: "text",
        body: "Nội dung cũ",
        talks: "",
        passwordHash: "s:h",
        registrable: false,
        requiresPassword: true,
        occupantName: null,
        pending: null,
        questions: [],
      },
    ]);
  });

  it("adds a fresh board for a seed id missing from persisted data", () => {
    const merged = mergeWithSeed([], [fixedSeed]);
    expect(merged).toEqual([
      {
        id: "a",
        title: "Cốc A",
        type: "text",
        registrable: false,
        requiresPassword: true,
        body: "",
        talks: "",
        passwordHash: null,
        occupantName: null,
        pending: null,
        questions: [],
      },
    ]);
  });

  it("keeps a persisted rename instead of reverting to the seed's title", () => {
    const persisted = [
      {
        id: "a",
        title: "Cốc Đã Đổi Tên",
        type: "text" as const,
        body: "Nội dung cũ",
        talks: "",
        passwordHash: "s:h",
        registrable: false,
        requiresPassword: true,
        occupantName: null,
        pending: null,
        questions: [],
      },
    ];
    const merged = mergeWithSeed(persisted, [fixedSeed]);
    expect(merged[0]?.title).toBe("Cốc Đã Đổi Tên");
  });

  it("drops a persisted board whose id is no longer in the seed list", () => {
    const persisted = [
      {
        id: "old",
        title: "Old",
        type: "text" as const,
        body: "x",
        passwordHash: null,
        registrable: false,
        occupantName: null,
        pending: null,
      },
    ];
    const merged = mergeWithSeed(persisted, [fixedSeed]);
    expect(merged.map((b) => b.id)).toEqual(["a"]);
  });

  it("falls back to the seed list when given non-array/invalid persisted data", () => {
    expect(mergeWithSeed(null, [fixedSeed])).toEqual([
      {
        id: "a",
        title: "Cốc A",
        type: "text",
        registrable: false,
        requiresPassword: true,
        body: "",
        talks: "",
        passwordHash: null,
        occupantName: null,
        pending: null,
        questions: [],
      },
    ]);
  });

  it("a seed's default body is used only when the board has never been persisted", () => {
    const seeded = { ...fixedSeed, id: "p", body: "mặc định" };
    expect(seedBoards([seeded])[0]?.body).toBe("mặc định");
    expect(mergeWithSeed([], [seeded])[0]?.body).toBe("mặc định");
    const persisted = [
      {
        id: "p",
        title: "x",
        type: "text" as const,
        body: "đã sửa rồi",
        passwordHash: null,
        registrable: false,
        occupantName: null,
        pending: null,
      },
    ];
    expect(mergeWithSeed(persisted, [seeded])[0]?.body).toBe("đã sửa rồi");
  });

  it("a board seeded with requiresPassword: false can be edited with no password, ever", () => {
    const openPasswordSeed = { ...fixedSeed, id: "p", requiresPassword: false };
    const store = createBoardStore(seedBoards([openPasswordSeed]));
    expect(store.edit("p", "", { body: "Bài giảng 1" })).toBe("ok");
    expect(store.edit("p", "whatever", { body: "Bài giảng 2" })).toBe("ok");
    expect(store.get("p")?.body).toBe("Bài giảng 2");
    expect(store.snapshot()[0]?.passwordHash).toBeNull();
  });
});
