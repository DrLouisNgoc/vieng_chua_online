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
const MAX_NAME_LENGTH = 60;
const MAX_NOTE_LENGTH = 500;

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

function sendTooMany(res: ServerResponse, retryAfterMs: number): void {
  res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
  sendJson(res, 429, { error: "too-many-requests" });
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
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
  if (v === null) return null;
  const { password, body, talks, title } = v;
  // An empty password is valid: boards.ts ignores the password entirely for
  // a board that doesn't require one (the hall projector).
  if (
    typeof password !== "string" ||
    typeof body !== "string" ||
    password.length > 200 ||
    body.length > MAX_BODY_BYTES ||
    (talks !== undefined && (typeof talks !== "string" || talks.length > MAX_BODY_BYTES)) ||
    (title !== undefined && (typeof title !== "string" || title.length > MAX_NAME_LENGTH))
  )
    return null;
  return {
    password,
    body,
    ...(talks !== undefined && { talks }),
    ...(title !== undefined && { title }),
  };
}

function parseAskRequest(value: unknown): { name: string; text: string } | null {
  const v = asRecord(value);
  if (v === null) return null;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  const text = typeof v.text === "string" ? v.text.trim() : "";
  return name.length === 0 || name.length > MAX_NAME_LENGTH || text.length === 0 || text.length > MAX_NOTE_LENGTH
    ? null
    : { name, text };
}

function parseAnswerRequest(value: unknown): { password: string; questionId: string; answer: string } | null {
  const v = asRecord(value);
  if (v === null) return null;
  const { password, questionId, answer } = v;
  return typeof password !== "string" ||
    typeof questionId !== "string" ||
    typeof answer !== "string" ||
    password.length > 200 ||
    questionId.length === 0 ||
    answer.length === 0 ||
    answer.length > MAX_NOTE_LENGTH
    ? null
    : { password, questionId, answer };
}

function parseRegisterRequest(value: unknown): { name: string; note: string } | null {
  const v = asRecord(value);
  if (v === null) return null;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  const note = typeof v.note === "string" ? v.note.trim() : "";
  return name.length === 0 || name.length > MAX_NAME_LENGTH || note.length > MAX_NOTE_LENGTH ? null : { name, note };
}

function parsePasswordRequest(value: unknown): { password: string } | null {
  const v = asRecord(value);
  if (v === null) return null;
  const { password } = v;
  return typeof password !== "string" || password.length === 0 || password.length > 200 ? null : { password };
}

const BOARD_ACTIONS = ["register", "ask", "questions", "answer"] as const;
type BoardAction = (typeof BOARD_ACTIONS)[number];

type Route =
  | { kind: "boards" }
  | { kind: "board"; id: string }
  | { kind: BoardAction; id: string }
  | { kind: "admin-pending" }
  | { kind: "admin-approve"; id: string }
  | { kind: "admin-reject"; id: string };

function isBoardAction(value: string): value is BoardAction {
  return (BOARD_ACTIONS as readonly string[]).includes(value);
}

// `parts` are never empty strings (matchRoute filters them out).
function matchBoardsRoute(parts: string[]): Route | null {
  const [, id, action] = parts;
  if (parts.length === 1) return { kind: "boards" };
  if (parts.length === 2) return { kind: "board", id };
  return parts.length === 3 && isBoardAction(action) ? { kind: action, id } : null;
}

function matchAdminRoute(parts: string[]): Route | null {
  const [, action, id] = parts;
  if (parts.length === 2) return action === "pending" ? { kind: "admin-pending" } : null;
  if (parts.length !== 3) return null;
  if (action === "approve") return { kind: "admin-approve", id };
  return action === "reject" ? { kind: "admin-reject", id } : null;
}

function matchRoute(pathname: string): Route | null {
  const parts = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
  if (parts[0] === "boards") return matchBoardsRoute(parts);
  if (parts[0] === "admin") return matchAdminRoute(parts);
  return null;
}

// One request in flight, with what its handlers need.
interface Exchange {
  req: IncomingMessage;
  res: ServerResponse;
  store: BoardStore;
  persist: () => void;
  // Counts the failure toward the ip's lockout and answers 403.
  rejectPassword: () => void;
  // False means it has already answered 403.
  isAdmin: (password: string) => boolean;
}

function answerGet({ res, store }: Exchange, route: Route): void {
  const board = route.kind === "board" ? store.get(route.id) : undefined;
  if (route.kind === "boards") sendJson(res, 200, { boards: store.list() });
  else if (board) sendJson(res, 200, board);
  else sendJson(res, 404, NOT_FOUND);
}

async function readRequest<T>(req: IncomingMessage, parse: (value: unknown) => T | null): Promise<T | null> {
  try {
    return parse(await readJsonBody(req));
  } catch {
    return null; // not JSON or too large: answered 400 like a wrong shape
  }
}

// Reads the body, answers 400 if it is not JSON or not the expected shape,
// otherwise hands the parsed request to `act`.
async function handlePost<T>(
  ex: Exchange,
  parse: (value: unknown) => T | null,
  act: (input: T) => void,
): Promise<void> {
  const input = await readRequest(ex.req, parse);
  if (input === null) sendJson(ex.res, 400, INVALID_REQUEST);
  else act(input);
}

// "ok" saves and answers 200; every failure maps to its status code.
function finishWrite(ex: Exchange, result: WriteResult): void {
  if (result === "ok") {
    ex.persist();
    sendJson(ex.res, 200, { ok: true });
  } else if (result === "wrong-password") {
    ex.rejectPassword();
  } else {
    sendJson(ex.res, FAILURE_STATUS[result], { error: result });
  }
}

function answerQuestions(ex: Exchange, id: string, password: string): void {
  const result = ex.store.readQuestions(id, password);
  if (result.outcome === "not-found") sendJson(ex.res, 404, NOT_FOUND);
  else if (result.outcome === "wrong-password") ex.rejectPassword();
  else sendJson(ex.res, 200, { questions: result.questions });
}

function answerPending(ex: Exchange, password: string): void {
  if (!ex.isAdmin(password)) return;
  ex.persist(); // first login may have just set the admin password
  sendJson(ex.res, 200, { registrations: ex.store.listPending() });
}

async function answerPost(ex: Exchange, route: Exclude<Route, { kind: "boards" }>): Promise<void> {
  const { store } = ex;
  switch (route.kind) {
    case "board": {
      return handlePost(ex, parseEditRequest, ({ password, body, talks, title }) =>
        finishWrite(ex, store.edit(route.id, password, { body, talks, title })),
      );
    }
    case "ask": {
      return handlePost(ex, parseAskRequest, ({ name, text }) => finishWrite(ex, store.ask(route.id, name, text)));
    }
    case "answer": {
      return handlePost(ex, parseAnswerRequest, ({ password, questionId, answer }) =>
        finishWrite(ex, store.answer(route.id, password, questionId, answer)),
      );
    }
    case "register": {
      return handlePost(ex, parseRegisterRequest, ({ name, note }) =>
        finishWrite(ex, store.register(route.id, name, note)),
      );
    }
    case "questions": {
      return handlePost(ex, parsePasswordRequest, ({ password }) => answerQuestions(ex, route.id, password));
    }
    case "admin-pending": {
      return handlePost(ex, parsePasswordRequest, ({ password }) => answerPending(ex, password));
    }
    case "admin-approve": {
      return handlePost(ex, parsePasswordRequest, ({ password }) => {
        if (ex.isAdmin(password)) finishWrite(ex, store.approve(route.id));
      });
    }
    case "admin-reject": {
      return handlePost(ex, parsePasswordRequest, ({ password }) => {
        if (ex.isAdmin(password)) finishWrite(ex, store.reject(route.id));
      });
    }
    default: {
      return route satisfies never; // every route kind has a case above
    }
  }
}

export function createBoardsRequestListener(
  store: BoardStore,
  adminAuth: AdminAuth,
  persist: () => void,
  limitOverrides: Partial<RequestLimits> = {},
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const limits = { ...DEFAULT_LIMITS, ...limitOverrides };
  const posts = createWindowCounter({ windowMs: limits.postWindowMs });
  const passwordFailures = createWindowCounter({ windowMs: limits.passwordFailureWindowMs });

  // True means it has already answered 429.
  const isPostRefused = (res: ServerResponse, ip: string, route: Route): boolean => {
    if (posts.hit(ip) > limits.postsPerWindow) {
      sendTooMany(res, limits.postWindowMs);
      return true;
    }
    const isLockedOut = passwordFailures.count(ip) >= limits.passwordFailuresPerWindow;
    if (isLockedOut && PASSWORD_ROUTES.has(route.kind)) {
      sendTooMany(res, limits.passwordFailureWindowMs);
      return true;
    }
    return false;
  };

  return async (req, res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const route = matchRoute(new URL(req.url ?? "/", "http://localhost").pathname);
    if (route === null) {
      sendJson(res, 404, NOT_FOUND);
      return;
    }
    const ip = clientIp(req);
    if (req.method === "POST" && isPostRefused(res, ip, route)) return;

    const rejectPassword = (): void => {
      passwordFailures.hit(ip);
      sendJson(res, 403, { error: "wrong-password" });
    };
    const isAdmin = (password: string): boolean => {
      if (adminAuth.authenticate(password) === "ok") return true;
      rejectPassword();
      return false;
    };
    const ex: Exchange = { req, res, store, persist, rejectPassword, isAdmin };
    if (req.method === "GET") answerGet(ex, route);
    else if (req.method === "POST" && route.kind !== "boards") await answerPost(ex, route);
    else sendJson(res, 404, NOT_FOUND);
  };
}
