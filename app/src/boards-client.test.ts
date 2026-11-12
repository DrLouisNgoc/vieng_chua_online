import { describe, expect, it, vi } from "vitest";

import {
  createBoardsClient,
  parseQuoteImages,
  parseTalks,
  sutraFlipDirection,
  sutraOfTheDay,
  turnSutraPage,
  youtubeVideoId,
} from "./boards-client";

describe("youtubeVideoId", () => {
  it("extracts the id from a watch URL with extra query params", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=VsfXrl13dI4&t=2365s")).toBe("VsfXrl13dI4");
  });

  it("extracts the id from a youtu.be short link", () => {
    expect(youtubeVideoId("https://youtu.be/VsfXrl13dI4")).toBe("VsfXrl13dI4");
  });

  it("returns null for something that isn't a YouTube link", () => {
    expect(youtubeVideoId("not a link")).toBeNull();
  });
});

describe("parseTalks", () => {
  it("splits title and url on the first '|'", () => {
    expect(parseTalks("Vô thường | https://youtu.be/abc123def")).toEqual([
      { title: "Vô thường", url: "https://youtu.be/abc123def" },
    ]);
  });

  it("falls back to the url as the title when there's no '|' (old format)", () => {
    expect(parseTalks("https://youtu.be/abc123def")).toEqual([
      { title: "https://youtu.be/abc123def", url: "https://youtu.be/abc123def" },
    ]);
  });

  it("parses one talk per line, skipping blank lines", () => {
    expect(parseTalks("A | u1\n\nB | u2\n")).toEqual([
      { title: "A", url: "u1" },
      { title: "B", url: "u2" },
    ]);
  });

  it("returns [] for empty input", () => {
    expect(parseTalks("")).toEqual([]);
    expect(parseTalks("   \n  ")).toEqual([]);
  });
});

describe("parseQuoteImages", () => {
  it("splits filename and caption on the first '|'", () => {
    expect(parseQuoteImages("vo-thuong.jpg | Vô thường là bản chất của vạn pháp")).toEqual([
      { file: "vo-thuong.jpg", caption: "Vô thường là bản chất của vạn pháp" },
    ]);
  });

  it("treats a line with no '|' as a filename with no caption", () => {
    expect(parseQuoteImages("tam-kinh.jpg")).toEqual([{ file: "tam-kinh.jpg", caption: "" }]);
  });

  it("returns [] for empty input", () => {
    expect(parseQuoteImages("")).toEqual([]);
  });
});

describe("sutraOfTheDay", () => {
  // Reuses Talk/parseTalks (owner enters "Tên kinh | link" lines, same as
  // bài giảng) — this app never stores the sutta's own (copyrighted)
  // translated text, only a title and a link to read it.
  const sutras = [
    { title: "A", url: "https://example.com/a" },
    { title: "B", url: "https://example.com/b" },
    { title: "C", url: "https://example.com/c" },
  ];

  it("returns null for an empty list", () => {
    expect(sutraOfTheDay([], new Date(2026, 0, 1))).toBeNull();
  });

  it("picks the same sutra for every moment within one local day", () => {
    const morning = sutraOfTheDay(sutras, new Date(2026, 0, 1, 0, 1));
    const night = sutraOfTheDay(sutras, new Date(2026, 0, 1, 23, 59));
    expect(morning).toEqual(night);
  });

  it("picks a different sutra (deterministically) the next day, cycling through the list", () => {
    const day1 = sutraOfTheDay(sutras, new Date(2026, 0, 1));
    const day2 = sutraOfTheDay(sutras, new Date(2026, 0, 2));
    const day4 = sutraOfTheDay(sutras, new Date(2026, 0, 4));
    expect(day1).not.toEqual(day2);
    expect(day1).toEqual(day4); // cycles with period 3
  });
});

describe("turnSutraPage", () => {
  it("moves one page forward", () => {
    expect(turnSutraPage(0, 3, 1)).toBe(1);
  });

  it("moves one page back", () => {
    expect(turnSutraPage(1, 3, -1)).toBe(0);
  });

  it("stops at the last page instead of wrapping around", () => {
    expect(turnSutraPage(2, 3, 1)).toBe(2);
  });

  it("stops at the first page instead of wrapping around", () => {
    expect(turnSutraPage(0, 3, -1)).toBe(0);
  });
});

describe("sutraFlipDirection", () => {
  it("is null on first open (no previous page)", () => {
    expect(sutraFlipDirection(null, 0)).toBeNull();
  });

  it("is null when the page didn't change", () => {
    expect(sutraFlipDirection(2, 2)).toBeNull();
  });

  it("is next when moving to a later page", () => {
    expect(sutraFlipDirection(0, 1)).toBe("next");
  });

  it("is prev when moving to an earlier page", () => {
    expect(sutraFlipDirection(2, 0)).toBe("prev");
  });
});

function fakeFetch(status: number, json: unknown): typeof fetch {
  const response = { ok: status >= 200 && status < 300, status, json: vi.fn().mockResolvedValue(json) };
  return vi.fn<typeof fetch>().mockResolvedValue(response as unknown as Response);
}

const board = {
  id: "a",
  title: "Cốc A",
  type: "text" as const,
  body: "",
  talks: "",
  registrable: false,
  occupantName: null,
  pendingName: null,
  answeredQuestions: [],
};

describe("boards-client", () => {
  it("lists boards", async () => {
    const client = createBoardsClient("http://localhost", fakeFetch(200, { boards: [board] }));
    expect(await client.list()).toEqual([board]);
  });

  it("list returns [] on a network failure", async () => {
    const failing = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    const client = createBoardsClient("http://localhost", failing);
    expect(await client.list()).toEqual([]);
  });

  it("edit: ok on 200", async () => {
    const client = createBoardsClient("http://localhost", fakeFetch(200, { ok: true }));
    expect(await client.edit("a", "p", "body")).toBe("ok");
  });

  it("edit: maps the error field for known failures", async () => {
    const client = createBoardsClient("http://localhost", fakeFetch(403, { error: "wrong-password" }));
    expect(await client.edit("a", "p", "body")).toBe("wrong-password");
  });

  it("edit: unknown failure becomes 'error'", async () => {
    const client = createBoardsClient("http://localhost", fakeFetch(500, {}));
    expect(await client.edit("a", "p", "body")).toBe("error");
  });

  it("register: ok and each known 409 reason", async () => {
    const ok = createBoardsClient("http://localhost", fakeFetch(200, { ok: true }));
    expect(await ok.register("a", "Tên", "note")).toBe("ok");
    const pending = createBoardsClient("http://localhost", fakeFetch(409, { error: "already-pending" }));
    expect(await pending.register("a", "Tên", "note")).toBe("already-pending");
  });

  it("adminPending: ok with registrations, or wrong-password", async () => {
    const ok = createBoardsClient("http://localhost", fakeFetch(200, { registrations: [] }));
    expect(await ok.adminPending("x")).toEqual({ outcome: "ok", registrations: [] });
    const denied = createBoardsClient("http://localhost", fakeFetch(403, { error: "wrong-password" }));
    expect(await denied.adminPending("x")).toEqual({ outcome: "wrong-password" });
  });

  it("adminApprove / adminReject map outcomes the same way", async () => {
    const ok = createBoardsClient("http://localhost", fakeFetch(200, { ok: true }));
    expect(await ok.adminApprove("a", "x")).toBe("ok");
    const none = createBoardsClient("http://localhost", fakeFetch(409, { error: "no-pending" }));
    expect(await none.adminReject("a", "x")).toBe("no-pending");
  });
});
