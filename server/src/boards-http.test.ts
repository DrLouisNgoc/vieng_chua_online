import type { Server } from "node:http";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createAdminAuth } from "./admin-auth.js";
import { createBoardStore, seedBoards } from "./boards.js";
import type { RequestLimits } from "./boards-http.js";
import { createBoardsRequestListener } from "./boards-http.js";

type Json = Record<string, unknown>;

const servers: Server[] = [];

afterEach(async () => {
  const closing = servers.splice(0).map(
    async (server) =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  );
  await Promise.all(closing);
});

function start(limits?: Partial<RequestLimits>) {
  const store = createBoardStore(
    seedBoards([
      { id: "a", title: "Cốc A", type: "text", registrable: false },
      { id: "o", title: "Cốc Trống", type: "text", registrable: true },
    ]),
  );
  const adminAuth = createAdminAuth(null);
  const persisted: unknown[] = [];
  const persist = (): void => {
    persisted.push(store.snapshot());
  };
  const server = createServer(createBoardsRequestListener(store, adminAuth, persist, limits));
  servers.push(server);
  server.listen(0);
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${String(port)}`, persisted };
}

// `ip` simulates Caddy's X-Forwarded-For for a given visitor.
async function postJson(url: string, body: unknown, ip = "198.51.100.1") {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify(body),
  });
}

async function postStatus(url: string, body: unknown, ip?: string): Promise<number> {
  const res = await postJson(url, body, ip);
  return res.status;
}

async function getStatus(url: string, init?: RequestInit): Promise<number> {
  const res = await fetch(url, init);
  return res.status;
}

async function readJson<T = Json>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function getJson<T = Json>(url: string): Promise<T> {
  return readJson<T>(await fetch(url));
}

describe("boards HTTP API", () => {
  it("lists boards publicly, without password hashes", async () => {
    const { url } = start();
    const res = await fetch(`${url}/boards`);
    expect(res.status).toBe(200);
    const { boards } = await readJson<{ boards: Json[] }>(res);
    expect(boards.find((b) => b.id === "a")).toEqual({
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
    });
  });

  it("gets a single board, 404s an unknown one", async () => {
    const { url } = start();
    expect(await getStatus(`${url}/boards/a`)).toBe(200);
    expect(await getStatus(`${url}/boards/nope`)).toBe(404);
  });

  it("sets the password on the first edit of a fixed board, and persists", async () => {
    const { url, persisted } = start();
    const res = await postJson(`${url}/boards/a`, { password: "bimat", body: "Xin chào" });
    expect(res.status).toBe(200);
    expect(persisted).toHaveLength(1);
    const board = await getJson(`${url}/boards/a`);
    expect(board.body).toBe("Xin chào");
  });

  it("rejects a second edit with the wrong password, 403, and does not persist it", async () => {
    const { url, persisted } = start();
    await postJson(`${url}/boards/a`, { password: "bimat", body: "Xin chào" });
    const res = await postJson(`${url}/boards/a`, { password: "sai", body: "Hack" });
    expect(res.status).toBe(403);
    expect(persisted).toHaveLength(1);
    const board = await getJson(`${url}/boards/a`);
    expect(board.body).toBe("Xin chào");
  });

  it("404s editing an unknown board, 400s a malformed edit", async () => {
    const { url } = start();
    expect(await postStatus(`${url}/boards/nope`, { password: "x", body: "y" })).toBe(404);
    const res = await fetch(`${url}/boards/a`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  it("edit can also rename the board and set its talks list", async () => {
    const { url } = start();
    await postJson(`${url}/boards/a`, {
      password: "bimat",
      body: "Xin chào",
      talks: "Vô thường | https://x",
      title: "Tên mới",
    });
    const board = await getJson(`${url}/boards/a`);
    expect(board).toMatchObject({ title: "Tên mới", talks: "Vô thường | https://x" });
  });

  it("leaves a question for the board's occupant, readable only with the board's password", async () => {
    const { url } = start();
    await postJson(`${url}/boards/a`, { password: "bimat", body: "Xin chào" });
    const ask = await postJson(`${url}/boards/a/ask`, { name: "Khách", text: "Thưa thầy, con nên bắt đầu từ đâu?" });
    expect(ask.status).toBe(200);

    const wrong = await postJson(`${url}/boards/a/questions`, { password: "sai" });
    expect(wrong.status).toBe(403);

    const right = await postJson(`${url}/boards/a/questions`, { password: "bimat" });
    expect(right.status).toBe(200);
    const { questions } = await readJson<{ questions: Json[] }>(right);
    expect(questions).toMatchObject([{ name: "Khách", text: "Thưa thầy, con nên bắt đầu từ đâu?", answer: null }]);
    expect(typeof questions[0]?.id).toBe("string");
  });

  it("answers a question, which then shows publicly on the board", async () => {
    const { url } = start();
    await postJson(`${url}/boards/a`, { password: "bimat", body: "Xin chào" });
    await postJson(`${url}/boards/a/ask`, { name: "Khách", text: "Con nên bắt đầu từ đâu?" });
    const { questions } = await readJson<{ questions: Json[] }>(
      await postJson(`${url}/boards/a/questions`, { password: "bimat" }),
    );
    const questionId = questions[0]?.id;

    const wrong = await postJson(`${url}/boards/a/answer`, { password: "sai", questionId, answer: "x" });
    expect(wrong.status).toBe(403);

    const res = await postJson(`${url}/boards/a/answer`, {
      password: "bimat",
      questionId,
      answer: "Bắt đầu từ hơi thở.",
    });
    expect(res.status).toBe(200);

    const board = await getJson(`${url}/boards/a`);
    expect(board.answeredQuestions).toEqual([
      { id: questionId, name: "Khách", text: "Con nên bắt đầu từ đâu?", answer: "Bắt đầu từ hơi thở." },
    ]);
  });

  it("409s asking an open cốc with no occupant yet, 400s a malformed ask", async () => {
    const { url } = start();
    const res = await postJson(`${url}/boards/o/ask`, { name: "Khách", text: "x" });
    expect(res.status).toBe(409);
    expect(await postStatus(`${url}/boards/a/ask`, { name: "", text: "x" })).toBe(400);
  });

  it("409s editing an open cốc with no occupant yet", async () => {
    const { url } = start();
    const res = await postJson(`${url}/boards/o`, { password: "x", body: "y" });
    expect(res.status).toBe(409);
  });

  it("registers for an open cốc, then blocks a second registration", async () => {
    const { url } = start();
    const first = await postJson(`${url}/boards/o/register`, { name: "Chú Tâm", note: "ghi chú" });
    expect(first.status).toBe(200);
    const second = await postJson(`${url}/boards/o/register`, { name: "Khác", note: "" });
    expect(second.status).toBe(409);
  });

  it("409s registering a non-registrable board", async () => {
    const { url } = start();
    const res = await postJson(`${url}/boards/a/register`, { name: "Ai đó", note: "" });
    expect(res.status).toBe(409);
  });

  it("admin: first login sets the password and lists pending registrations", async () => {
    const { url, persisted } = start();
    await postJson(`${url}/boards/o/register`, { name: "Chú Tâm", note: "ghi chú" });
    const res = await postJson(`${url}/admin/pending`, { password: "adminpass" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      registrations: [{ id: "o", title: "Cốc Trống", name: "Chú Tâm", note: "ghi chú" }],
    });
    expect(persisted).toHaveLength(2); // register + admin first-login
  });

  it("admin: wrong password after it's set is rejected", async () => {
    const { url } = start();
    await postJson(`${url}/admin/pending`, { password: "adminpass" });
    const res = await postJson(`${url}/admin/pending`, { password: "sai" });
    expect(res.status).toBe(403);
  });

  it("admin: approve assigns the occupant; the board becomes editable", async () => {
    const { url } = start();
    await postJson(`${url}/boards/o/register`, { name: "Chú Tâm", note: "ghi chú" });
    const approve = await postJson(`${url}/admin/approve/o`, { password: "adminpass" });
    expect(approve.status).toBe(200);
    const board = await getJson(`${url}/boards/o`);
    expect(board).toMatchObject({ occupantName: "Chú Tâm", pendingName: null });
    const edit = await postJson(`${url}/boards/o`, { password: "mkpass", body: "Bài pháp" });
    expect(edit.status).toBe(200);
  });

  it("admin: reject clears the pending registration, re-opening the cốc", async () => {
    const { url } = start();
    await postJson(`${url}/boards/o/register`, { name: "Chú Tâm", note: "ghi chú" });
    const reject = await postJson(`${url}/admin/reject/o`, { password: "adminpass" });
    expect(reject.status).toBe(200);
    const board = await getJson(`${url}/boards/o`);
    expect(board).toMatchObject({ occupantName: null, pendingName: null });
  });

  it("admin: approving or rejecting an unknown board is a 404", async () => {
    const { url } = start();
    expect(await postStatus(`${url}/admin/approve/nope`, { password: "adminpass" })).toBe(404);
    expect(await postStatus(`${url}/admin/reject/nope`, { password: "adminpass" })).toBe(404);
  });

  it("admin: approving with nothing pending is a 409", async () => {
    const { url } = start();
    const res = await postJson(`${url}/admin/approve/o`, { password: "adminpass" });
    expect(res.status).toBe(409);
  });

  it("locks out an ip after too many wrong passwords, even when it then tries the right one", async () => {
    const { url } = start({ passwordFailuresPerWindow: 3 });
    await postJson(`${url}/admin/pending`, { password: "adminpass" }); // first login sets it
    // One after another: each failure must be counted before the next try.
    const guesses = [
      await postStatus(`${url}/admin/pending`, { password: "guess0" }),
      await postStatus(`${url}/admin/pending`, { password: "guess1" }),
      await postStatus(`${url}/admin/pending`, { password: "guess2" }),
    ];
    expect(guesses).toEqual([403, 403, 403]);
    const locked = await postJson(`${url}/admin/pending`, { password: "adminpass" });
    expect(locked.status).toBe(429);
    expect(await locked.json()).toEqual({ error: "too-many-requests" });
  });

  it("counts wrong passwords on cốc boards toward the same lockout", async () => {
    const { url } = start({ passwordFailuresPerWindow: 2 });
    await postJson(`${url}/boards/a`, { password: "bimat", body: "Xin chào" });
    await postJson(`${url}/boards/a/questions`, { password: "sai" });
    await postJson(`${url}/boards/a`, { password: "sai", body: "x" });
    expect(await postStatus(`${url}/boards/a/questions`, { password: "bimat" })).toBe(429);
  });

  it("does not lock out a different visitor", async () => {
    const { url } = start({ passwordFailuresPerWindow: 1 });
    await postJson(`${url}/admin/pending`, { password: "adminpass" }, "198.51.100.2");
    await postJson(`${url}/admin/pending`, { password: "sai" }, "198.51.100.3");
    expect(await postStatus(`${url}/admin/pending`, { password: "adminpass" }, "198.51.100.2")).toBe(200);
  });

  it("caps how many writes one ip can send in a window", async () => {
    const { url } = start({ postsPerWindow: 2 });
    await postJson(`${url}/boards/a`, { password: "bimat", body: "Xin chào" });
    await postJson(`${url}/boards/a/ask`, { name: "Khách", text: "Câu 1" });
    const flooded = await postJson(`${url}/boards/a/ask`, { name: "Khách", text: "Câu 2" });
    expect(flooded.status).toBe(429);
    expect(flooded.headers.get("retry-after")).not.toBeNull();
  });

  it("404s unknown paths and methods a route does not take", async () => {
    const { url } = start();
    // Unknown paths, then write-only routes read with GET.
    const paths = ["/", "/nope", "/boards/a/nope", "/boards/a/b/c", "/admin", "/admin/approve", "/admin/x/o"];
    const writeOnly = ["/boards/a/register", "/boards/a/questions", "/admin/pending"];
    const statuses = await Promise.all([...paths, ...writeOnly].map(async (path) => getStatus(`${url}${path}`)));
    expect(statuses).toEqual([...paths, ...writeOnly].map(() => 404));
    expect(await postStatus(`${url}/boards`, {})).toBe(404);
    expect(await getStatus(`${url}/boards/a`, { method: "PUT" })).toBe(404);
  });

  it("400s a body of the wrong shape on every write route", async () => {
    const { url } = start();
    const boardRoutes = ["/boards/a", "/boards/a/ask", "/boards/a/answer", "/boards/o/register", "/boards/a/questions"];
    const adminRoutes = ["/admin/pending", "/admin/approve/o", "/admin/reject/o"];
    const statuses = await Promise.all([
      ...boardRoutes.map(async (path) => postStatus(`${url}${path}`, { name: 1 })),
      ...adminRoutes.map(async (path) => postStatus(`${url}${path}`, [])),
    ]);
    expect(statuses).toEqual([...boardRoutes, ...adminRoutes].map(() => 400));
  });

  it("answers CORS preflight", async () => {
    const { url } = start();
    const res = await fetch(`${url}/boards`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
