import { describe, it, expect, vi } from "vitest";
import { createBoardsClient } from "./boards-client";

function fakeFetch(status: number, json: unknown): typeof fetch {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  })) as unknown as typeof fetch;
}

const board = {
  id: "a",
  title: "Cốc A",
  type: "text" as const,
  body: "",
  registrable: false,
  occupantName: null,
  pendingName: null,
};

describe("boards-client", () => {
  it("lists boards", async () => {
    const client = createBoardsClient("http://x", fakeFetch(200, { boards: [board] }));
    expect(await client.list()).toEqual([board]);
  });

  it("list returns [] on a network failure", async () => {
    const failing = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const client = createBoardsClient("http://x", failing);
    expect(await client.list()).toEqual([]);
  });

  it("edit: ok on 200", async () => {
    const client = createBoardsClient("http://x", fakeFetch(200, { ok: true }));
    expect(await client.edit("a", "p", "body")).toBe("ok");
  });

  it("edit: maps the error field for known failures", async () => {
    const client = createBoardsClient("http://x", fakeFetch(403, { error: "wrong-password" }));
    expect(await client.edit("a", "p", "body")).toBe("wrong-password");
  });

  it("edit: unknown failure becomes 'error'", async () => {
    const client = createBoardsClient("http://x", fakeFetch(500, {}));
    expect(await client.edit("a", "p", "body")).toBe("error");
  });

  it("register: ok and each known 409 reason", async () => {
    const ok = createBoardsClient("http://x", fakeFetch(200, { ok: true }));
    expect(await ok.register("a", "Tên", "note")).toBe("ok");
    const pending = createBoardsClient("http://x", fakeFetch(409, { error: "already-pending" }));
    expect(await pending.register("a", "Tên", "note")).toBe("already-pending");
  });

  it("adminPending: ok with registrations, or wrong-password", async () => {
    const ok = createBoardsClient("http://x", fakeFetch(200, { registrations: [] }));
    expect(await ok.adminPending("x")).toEqual({ outcome: "ok", registrations: [] });
    const denied = createBoardsClient("http://x", fakeFetch(403, { error: "wrong-password" }));
    expect(await denied.adminPending("x")).toEqual({ outcome: "wrong-password" });
  });

  it("adminApprove / adminReject map outcomes the same way", async () => {
    const ok = createBoardsClient("http://x", fakeFetch(200, { ok: true }));
    expect(await ok.adminApprove("a", "x")).toBe("ok");
    const none = createBoardsClient("http://x", fakeFetch(409, { error: "no-pending" }));
    expect(await none.adminReject("a", "x")).toBe("no-pending");
  });
});
