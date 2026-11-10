// Plain HTTP (no framework, matches this server's minimal `ws`-only
// dependency footprint) for boards: reading/editing content, registering
// for an open cốc, and the owner's admin approval panel.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AdminAuth } from "./adminAuth.js";
import type { BoardStore } from "./boards.js";

// A dharma talk is a few paragraphs plus a handful of YouTube links; this
// is generous headroom while still bounding memory per request.
const MAX_BODY_BYTES = 50_000;
const MAX_NAME_LENGTH = 60;
const MAX_NOTE_LENGTH = 500;

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(payload);
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseEditRequest(
  value: unknown,
): { password: string; body: string; talks?: string; title?: string } | null {
  const v = asRecord(value);
  if (!v) return null;
  const { password, body, talks, title } = v;
  // Empty is valid: boards.ts ignores the password entirely for a board
  // that doesn't require one (the hall projector).
  if (typeof password !== "string" || password.length > 200) return null;
  if (typeof body !== "string" || body.length > MAX_BODY_BYTES) return null;
  if (talks !== undefined && (typeof talks !== "string" || talks.length > MAX_BODY_BYTES)) return null;
  if (title !== undefined && (typeof title !== "string" || title.length > MAX_NAME_LENGTH)) return null;
  return {
    password,
    body,
    ...(talks !== undefined ? { talks } : {}),
    ...(title !== undefined ? { title } : {}),
  };
}

function parseAskRequest(value: unknown): { name: string; text: string } | null {
  const v = asRecord(value);
  if (!v) return null;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  const text = typeof v.text === "string" ? v.text.trim() : "";
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  if (text.length === 0 || text.length > MAX_NOTE_LENGTH) return null;
  return { name, text };
}

function parseRegisterRequest(value: unknown): { name: string; note: string } | null {
  const v = asRecord(value);
  if (!v) return null;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  const note = typeof v.note === "string" ? v.note.trim() : "";
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  if (note.length > MAX_NOTE_LENGTH) return null;
  return { name, note };
}

function parsePasswordRequest(value: unknown): { password: string } | null {
  const v = asRecord(value);
  if (!v) return null;
  const { password } = v;
  if (typeof password !== "string" || password.length === 0 || password.length > 200) return null;
  return { password };
}

type Route =
  | { kind: "boards" }
  | { kind: "board"; id: string }
  | { kind: "register"; id: string }
  | { kind: "ask"; id: string }
  | { kind: "questions"; id: string }
  | { kind: "admin-pending" }
  | { kind: "admin-approve"; id: string }
  | { kind: "admin-reject"; id: string }
  | null;

function matchRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "boards") {
    if (parts.length === 1) return { kind: "boards" };
    if (parts.length === 2 && parts[1]) return { kind: "board", id: parts[1] };
    if (parts.length === 3 && parts[1] && parts[2] === "register") return { kind: "register", id: parts[1] };
    if (parts.length === 3 && parts[1] && parts[2] === "ask") return { kind: "ask", id: parts[1] };
    if (parts.length === 3 && parts[1] && parts[2] === "questions") return { kind: "questions", id: parts[1] };
    return null;
  }
  if (parts[0] === "admin") {
    if (parts.length === 2 && parts[1] === "pending") return { kind: "admin-pending" };
    if (parts.length === 3 && parts[1] === "approve" && parts[2]) return { kind: "admin-approve", id: parts[2] };
    if (parts.length === 3 && parts[1] === "reject" && parts[2]) return { kind: "admin-reject", id: parts[2] };
    return null;
  }
  return null;
}

export function createBoardsRequestListener(
  store: BoardStore,
  adminAuth: AdminAuth,
  persist: () => void,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");
    const route = matchRoute(url.pathname);
    if (!route) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }

    if (req.method === "GET" && route.kind === "boards") {
      sendJson(res, 200, { boards: store.list() });
      return;
    }

    if (req.method === "GET" && route.kind === "board") {
      const board = store.get(route.id);
      if (!board) {
        sendJson(res, 404, { error: "not-found" });
        return;
      }
      sendJson(res, 200, board);
      return;
    }

    if (req.method === "POST" && route.kind === "board") {
      readJsonBody(req).then(
        (value) => {
          const parsed = parseEditRequest(value);
          if (!parsed) return sendJson(res, 400, { error: "invalid-request" });
          const result = store.edit(route.id, parsed.password, parsed.body, parsed.talks, parsed.title);
          if (result === "not-found") return sendJson(res, 404, { error: "not-found" });
          if (result === "wrong-password") return sendJson(res, 403, { error: "wrong-password" });
          if (result === "not-assigned") return sendJson(res, 409, { error: "not-assigned" });
          persist();
          sendJson(res, 200, { ok: true });
        },
        () => sendJson(res, 400, { error: "invalid-request" }),
      );
      return;
    }

    if (req.method === "POST" && route.kind === "ask") {
      readJsonBody(req).then(
        (value) => {
          const parsed = parseAskRequest(value);
          if (!parsed) return sendJson(res, 400, { error: "invalid-request" });
          const result = store.ask(route.id, parsed.name, parsed.text);
          if (result === "not-found") return sendJson(res, 404, { error: "not-found" });
          if (result === "not-assigned") return sendJson(res, 409, { error: "not-assigned" });
          persist();
          sendJson(res, 200, { ok: true });
        },
        () => sendJson(res, 400, { error: "invalid-request" }),
      );
      return;
    }

    if (req.method === "POST" && route.kind === "questions") {
      readJsonBody(req).then(
        (value) => {
          const parsed = parsePasswordRequest(value);
          if (!parsed) return sendJson(res, 400, { error: "invalid-request" });
          const result = store.readQuestions(route.id, parsed.password);
          if (result.outcome === "not-found") return sendJson(res, 404, { error: "not-found" });
          if (result.outcome === "wrong-password") return sendJson(res, 403, { error: "wrong-password" });
          sendJson(res, 200, { questions: result.questions });
        },
        () => sendJson(res, 400, { error: "invalid-request" }),
      );
      return;
    }

    if (req.method === "POST" && route.kind === "register") {
      readJsonBody(req).then(
        (value) => {
          const parsed = parseRegisterRequest(value);
          if (!parsed) return sendJson(res, 400, { error: "invalid-request" });
          const result = store.register(route.id, parsed.name, parsed.note);
          if (result === "not-found") return sendJson(res, 404, { error: "not-found" });
          if (result === "not-registrable") return sendJson(res, 409, { error: "not-registrable" });
          if (result === "already-pending") return sendJson(res, 409, { error: "already-pending" });
          if (result === "already-assigned") return sendJson(res, 409, { error: "already-assigned" });
          persist();
          sendJson(res, 200, { ok: true });
        },
        () => sendJson(res, 400, { error: "invalid-request" }),
      );
      return;
    }

    if (req.method === "POST" && route.kind === "admin-pending") {
      readJsonBody(req).then(
        (value) => {
          const parsed = parsePasswordRequest(value);
          if (!parsed) return sendJson(res, 400, { error: "invalid-request" });
          if (adminAuth.authenticate(parsed.password) === "wrong-password") {
            return sendJson(res, 403, { error: "wrong-password" });
          }
          persist(); // first login may have just set the admin password
          sendJson(res, 200, { registrations: store.listPending() });
        },
        () => sendJson(res, 400, { error: "invalid-request" }),
      );
      return;
    }

    if (req.method === "POST" && (route.kind === "admin-approve" || route.kind === "admin-reject")) {
      const decide = route.kind === "admin-approve" ? store.approve : store.reject;
      readJsonBody(req).then(
        (value) => {
          const parsed = parsePasswordRequest(value);
          if (!parsed) return sendJson(res, 400, { error: "invalid-request" });
          if (adminAuth.authenticate(parsed.password) === "wrong-password") {
            return sendJson(res, 403, { error: "wrong-password" });
          }
          const result = decide(route.id);
          if (result === "not-found") return sendJson(res, 404, { error: "not-found" });
          if (result === "no-pending") return sendJson(res, 409, { error: "no-pending" });
          persist();
          sendJson(res, 200, { ok: true });
        },
        () => sendJson(res, 400, { error: "invalid-request" }),
      );
      return;
    }

    sendJson(res, 404, { error: "not-found" });
  };
}
