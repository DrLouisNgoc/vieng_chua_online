import { describe, it, expect, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createAdminAuth } from "./adminAuth.js";
import { createBoardStore, seedBoards } from "./boards.js";
import { createBoardsRequestListener } from "./boardsHttp.js";

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

function start() {
  const store = createBoardStore(
    seedBoards([
      { id: "a", title: "Cốc A", type: "text", registrable: false },
      { id: "o", title: "Cốc Trống", type: "text", registrable: true },
    ]),
  );
  const adminAuth = createAdminAuth(null);
  const persisted: unknown[] = [];
  server = createServer(createBoardsRequestListener(store, adminAuth, () => persisted.push(store.snapshot())));
  server.listen(0);
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, persisted };
}

function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("boards HTTP API", () => {
  it("lists boards publicly, without password hashes", async () => {
    const { url } = start();
    const res = await fetch(`${url}/boards`);
    expect(res.status).toBe(200);
    const { boards } = await res.json();
    expect(boards.find((b: { id: string }) => b.id === "a")).toEqual({
      id: "a",
      title: "Cốc A",
      type: "text",
      body: "",
      talks: "",
      registrable: false,
      requiresPassword: true,
      occupantName: null,
      pendingName: null,
    });
  });

  it("gets a single board, 404s an unknown one", async () => {
    const { url } = start();
    expect((await fetch(`${url}/boards/a`)).status).toBe(200);
    expect((await fetch(`${url}/boards/nope`)).status).toBe(404);
  });

  it("sets the password on the first edit of a fixed board, and persists", async () => {
    const { url, persisted } = start();
    const res = await postJson(`${url}/boards/a`, { password: "bimat", body: "Xin chào" });
    expect(res.status).toBe(200);
    expect(persisted).toHaveLength(1);
    expect((await (await fetch(`${url}/boards/a`)).json()).body).toBe("Xin chào");
  });

  it("rejects a second edit with the wrong password, 403, and does not persist it", async () => {
    const { url, persisted } = start();
    await postJson(`${url}/boards/a`, { password: "bimat", body: "Xin chào" });
    const res = await postJson(`${url}/boards/a`, { password: "sai", body: "Hack" });
    expect(res.status).toBe(403);
    expect(persisted).toHaveLength(1);
    expect((await (await fetch(`${url}/boards/a`)).json()).body).toBe("Xin chào");
  });

  it("404s editing an unknown board, 400s a malformed edit", async () => {
    const { url } = start();
    expect((await postJson(`${url}/boards/nope`, { password: "x", body: "y" })).status).toBe(404);
    const res = await fetch(`${url}/boards/a`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  it("edit can also rename the board and set its talks list", async () => {
    const { url } = start();
    await postJson(`${url}/boards/a`, { password: "bimat", body: "Xin chào", talks: "Vô thường | https://x", title: "Tên mới" });
    const board = await (await fetch(`${url}/boards/a`)).json();
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
    expect(await right.json()).toEqual({
      questions: [{ name: "Khách", text: "Thưa thầy, con nên bắt đầu từ đâu?" }],
    });
  });

  it("409s asking an open cốc with no occupant yet, 400s a malformed ask", async () => {
    const { url } = start();
    const res = await postJson(`${url}/boards/o/ask`, { name: "Khách", text: "x" });
    expect(res.status).toBe(409);
    expect((await postJson(`${url}/boards/a/ask`, { name: "", text: "x" })).status).toBe(400);
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
    const board = await (await fetch(`${url}/boards/o`)).json();
    expect(board).toMatchObject({ occupantName: "Chú Tâm", pendingName: null });
    const edit = await postJson(`${url}/boards/o`, { password: "mkpass", body: "Bài pháp" });
    expect(edit.status).toBe(200);
  });

  it("admin: reject clears the pending registration, re-opening the cốc", async () => {
    const { url } = start();
    await postJson(`${url}/boards/o/register`, { name: "Chú Tâm", note: "ghi chú" });
    const reject = await postJson(`${url}/admin/reject/o`, { password: "adminpass" });
    expect(reject.status).toBe(200);
    const board = await (await fetch(`${url}/boards/o`)).json();
    expect(board).toMatchObject({ occupantName: null, pendingName: null });
  });

  it("admin: approving with nothing pending is a 409", async () => {
    const { url } = start();
    const res = await postJson(`${url}/admin/approve/o`, { password: "adminpass" });
    expect(res.status).toBe(409);
  });

  it("answers CORS preflight", async () => {
    const { url } = start();
    const res = await fetch(`${url}/boards`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
