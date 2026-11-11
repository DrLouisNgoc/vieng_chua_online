// Plain HTTP (no framework, matches this server's minimal `ws`-only
// dependency footprint) for boards: reading/editing content, registering
// for an open cốc, and the owner's admin approval panel.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AdminAuth } from "./admin-auth.js";
import type { AnswerResult, AskResult, BoardStore, DecisionResult, EditResult, RegisterResult } from "./boards.js";
import { clientIp } from "./client-ip.js";
import { createWindowCounter } from "./rate-limit.js";

const INVALID_REQUEST = { error: "invalid-request" };
const NOT_FOUND = { error: "not-found" };

type WriteResult = EditResult | RegisterResult | DecisionResult | AskResult | AnswerResult;
const FAILURE_STATUS: Record<Exclude<WriteResult, "ok" | "wrong-password">, number> = {
  "not-found": 404,
  "not-assigned": 409,
  "not-registrable": 409,
  "already-pending": 409,
  "already-assigned": 409,
  "no-pending": 409,
};

// A dharma talk is a few paragraphs plus a handful of YouTube links; this
// is generous headroom while still bounding memory per request.
const MAX_BODY_BYTES = 50_000;

// Per visitor ip. The admin password guards approvals for the whole site,
// and every password here is "first submit sets it" with no lockout of its
// own, so guessing must be slow. A real person never gets near either cap.
export interface RequestLimits {
  postsPerWindow: number;
  postWindowMs: number;
  passwordFailuresPerWindow: number;
  passwordFailureWindowMs: number;
}

const DEFAULT_LIMITS: RequestLimits = {
  postsPerWindow: 30,
  postWindowMs: 60_000,
  passwordFailuresPerWindow: 10,
  passwordFailureWindowMs: 15 * 60_000,
};

const PASSWORD_ROUTES = new Set(["board", "questions", "answer", "admin-pending", "admin-approve", "admin-reject"]);

function sendTooMany(res: ServerResponse, retryAfterMs: number): void {
  res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
  sendJson(res, 429, { error: "too-many-requests" });
}
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

function parseEditRequest(value: unknown): { password: string; body: string; talks?: string; title?: string } | null {
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

function parseAnswerRequest(value: unknown): { password: string; questionId: string; answer: string } | null {
  const v = asRecord(value);
  if (!v) return null;
  const { password, questionId, answer } = v;
  if (typeof password !== "string" || password.length > 200) return null;
  if (typeof questionId !== "string" || questionId.length === 0) return null;
  if (typeof answer !== "string" || answer.length === 0 || answer.length > MAX_NOTE_LENGTH) return null;
  return { password, questionId, answer };
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
  | { kind: "answer"; id: string }
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
    if (parts.length === 3 && parts[1] && parts[2] === "answer") return { kind: "answer", id: parts[1] };
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
  limitOverrides: Partial<RequestLimits> = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const limits = { ...DEFAULT_LIMITS, ...limitOverrides };
  const posts = createWindowCounter({ windowMs: limits.postWindowMs });
  const passwordFailures = createWindowCounter({ windowMs: limits.passwordFailureWindowMs });

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
      sendJson(res, 404, NOT_FOUND);
      return;
    }

    const ip = clientIp(req);
    if (req.method === "POST") {
      if (posts.hit(ip) > limits.postsPerWindow) return sendTooMany(res, limits.postWindowMs);
      const isLockedOut = passwordFailures.count(ip) >= limits.passwordFailuresPerWindow;
      if (PASSWORD_ROUTES.has(route.kind) && isLockedOut) {
        return sendTooMany(res, limits.passwordFailureWindowMs);
      }
    }
    const rejectPassword = (): void => {
      passwordFailures.hit(ip);
      sendJson(res, 403, { error: "wrong-password" });
    };

    if (req.method === "GET" && route.kind === "boards") {
      sendJson(res, 200, { boards: store.list() });
      return;
    }

    if (req.method === "GET" && route.kind === "board") {
      const board = store.get(route.id);
      if (!board) {
        sendJson(res, 404, NOT_FOUND);
        return;
      }
      sendJson(res, 200, board);
      return;
    }

    // Reads the body, answers 400 if it is not JSON or not the expected shape,
    // otherwise hands the parsed request to `act`.
    const handlePost = <T>(parse: (value: unknown) => T | null, act: (input: T) => void): void => {
      readJsonBody(req).then(
        (value) => {
          const input = parse(value);
          if (!input) return sendJson(res, 400, INVALID_REQUEST);
          act(input);
        },
        () => sendJson(res, 400, INVALID_REQUEST),
      );
    };
    // "ok" saves and answers 200; every failure maps to its status code.
    const finishWrite = (result: WriteResult): void => {
      if (result === "ok") {
        persist();
        sendJson(res, 200, { ok: true });
        return;
      }
      if (result === "wrong-password") return rejectPassword();
      sendJson(res, FAILURE_STATUS[result], { error: result });
    };
    const isAdmin = (password: string): boolean => {
      if (adminAuth.authenticate(password) === "ok") return true;
      rejectPassword();
      return false;
    };

    if (req.method === "POST") {
      switch (route.kind) {
        case "board":
          return handlePost(parseEditRequest, ({ password, body, talks, title }) =>
            finishWrite(store.edit(route.id, password, { body, talks, title })),
          );
        case "ask":
          return handlePost(parseAskRequest, ({ name, text }) => finishWrite(store.ask(route.id, name, text)));
        case "answer":
          return handlePost(parseAnswerRequest, ({ password, questionId, answer }) =>
            finishWrite(store.answer(route.id, password, questionId, answer)),
          );
        case "register":
          return handlePost(parseRegisterRequest, ({ name, note }) =>
            finishWrite(store.register(route.id, name, note)),
          );
        case "questions":
          return handlePost(parsePasswordRequest, ({ password }) => {
            const result = store.readQuestions(route.id, password);
            if (result.outcome === "not-found") return sendJson(res, 404, NOT_FOUND);
            if (result.outcome === "wrong-password") return rejectPassword();
            sendJson(res, 200, { questions: result.questions });
          });
        case "admin-pending":
          return handlePost(parsePasswordRequest, ({ password }) => {
            if (!isAdmin(password)) return;
            persist(); // first login may have just set the admin password
            sendJson(res, 200, { registrations: store.listPending() });
          });
        case "admin-approve":
        case "admin-reject": {
          const decide = route.kind === "admin-approve" ? store.approve : store.reject;
          return handlePost(parsePasswordRequest, ({ password }) => {
            if (isAdmin(password)) finishWrite(decide(route.id));
          });
        }
      }
    }

    sendJson(res, 404, NOT_FOUND);
  };
}
