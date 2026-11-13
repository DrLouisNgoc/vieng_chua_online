// Fetch wrapper for the server's boards HTTP API (server/src/boards-http.ts).
// Every method resolves, never throws — network/parse failures become the
// "error" outcome so callers (boards-panel.ts) can show one message.

// Shared by boards-panel.ts (the embed player) and main.ts (the in-world
// screen's thumbnail, since a YouTube embed can't feed a 3D texture).
export function youtubeVideoId(url: string): string | null {
  return /(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/.exec(url)?.[1] ?? null;
}

export interface Talk {
  title: string;
  url: string;
}

// The video board's body: one talk per line, "Tên bài | link YouTube"
// (owner, 2026-11-09: "làm thế nào để các bài giảng nghe có hệ thống").
// A line with no "|" (the format before this) falls back to the URL as
// its own title.
export function parseTalks(body: string): Talk[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bar = line.indexOf("|");
      if (bar === -1) return { title: line, url: line };
      const title = line.slice(0, bar).trim();
      const url = line.slice(bar + 1).trim();
      return { title: title === "" ? url : title, url };
    });
}

// A library entry (owner, 2026-11-12: "sửa lại cốc của sư như 1 thư viện
// sách") is a PDF book rather than a video talk when its url ends in .pdf;
// same "Tên | link" line format as a video talk, no server schema change.
export function isPdfTalk(talk: Talk): boolean {
  return talk.url.toLowerCase().endsWith(".pdf");
}

export type BoardType = "text" | "video" | "image";

export interface QuoteImage {
  file: string;
  caption: string;
}

// The chánh điện quote banner's body: one photo per line, "tên-file.jpg |
// Chú thích" (owner, 2026-11-10: "treo một số câu nói hay của sư phụ" —
// the owner's own photos, served from app/public/thirdparty/phap-cu/).
export function parseQuoteImages(body: string): QuoteImage[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bar = line.indexOf("|");
      return bar === -1
        ? { file: line, caption: "" }
        : { file: line.slice(0, bar).trim(), caption: line.slice(bar + 1).trim() };
    });
}

export interface BoardView {
  id: string;
  title: string;
  type: BoardType;
  body: string;
  talks: string;
  registrable: boolean;
  requiresPassword: boolean;
  occupantName: string | null;
  pendingName: string | null;
  answeredQuestions: AnsweredQuestion[];
}

export interface Question {
  id: string;
  name: string;
  text: string;
  answer: string | null;
}

export interface AnsweredQuestion {
  id: string;
  name: string;
  text: string;
  answer: string;
}

export interface AdminPendingEntry {
  id: string;
  title: string;
  name: string;
  note: string;
}

export type EditOutcome = "ok" | "wrong-password" | "not-found" | "not-assigned" | "error";
export type RegisterOutcome = "ok" | "not-found" | "not-registrable" | "already-pending" | "already-assigned" | "error";
export type AdminDecisionOutcome = "ok" | "wrong-password" | "not-found" | "no-pending" | "error";
export type AdminPendingResult =
  { outcome: "ok"; registrations: AdminPendingEntry[] } | { outcome: "wrong-password" | "error" };
export type AskOutcome = "ok" | "not-found" | "not-assigned" | "error";
export type AnswerOutcome = "ok" | "wrong-password" | "not-found" | "error";
export type ReadQuestionsResult =
  { outcome: "ok"; questions: Question[] } | { outcome: "wrong-password" | "not-found" | "error" };

// What an edit changes; talks and title are sent only when given.
export interface BoardEdit {
  body: string;
  talks?: string;
  title?: string;
}

export interface BoardsClient {
  list: () => Promise<BoardView[]>;
  edit: (id: string, password: string, changes: BoardEdit) => Promise<EditOutcome>;
  register: (id: string, name: string, note: string) => Promise<RegisterOutcome>;
  ask: (id: string, name: string, text: string) => Promise<AskOutcome>;
  readQuestions: (id: string, password: string) => Promise<ReadQuestionsResult>;
  answer: (id: string, password: string, questionId: string, answer: string) => Promise<AnswerOutcome>;
  adminPending: (password: string) => Promise<AdminPendingResult>;
  adminApprove: (id: string, password: string) => Promise<AdminDecisionOutcome>;
  adminReject: (id: string, password: string) => Promise<AdminDecisionOutcome>;
}

interface JsonReply {
  status: number;
  json: unknown;
}

function errorField(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const { error } = json as Record<string, unknown>;
  return typeof error === "string" ? error : null;
}

// The server's error field when it is one the caller knows, else "error".
function knownError<T extends string>(json: unknown, known: readonly T[]): T | "error" {
  const error = errorField(json);
  return known.find((outcome) => outcome === error) ?? "error";
}

function outcomeOf<T extends string>(reply: JsonReply, known: readonly T[]): "ok" | T | "error" {
  return reply.status === 200 ? "ok" : knownError(reply.json, known);
}

// The array under `key` in a 200 reply, else null.
function listIn(reply: JsonReply, key: string): unknown[] | null {
  if (reply.status !== 200 || typeof reply.json !== "object" || reply.json === null) return null;
  const list = (reply.json as Record<string, unknown>)[key];
  return Array.isArray(list) ? list : null;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function postJson(fetchImpl: typeof fetch, url: string, body: unknown): Promise<JsonReply> {
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, json: await readJson(res) };
  } catch {
    return { status: 0, json: null };
  }
}

function boardPath(id: string, action = ""): string {
  return `/boards/${encodeURIComponent(id)}${action}`;
}

export function createBoardsClient(baseUrl: string, fetchImpl: typeof fetch = fetch): BoardsClient {
  const post = async (path: string, body: unknown): Promise<JsonReply> =>
    postJson(fetchImpl, `${baseUrl}${path}`, body);

  return {
    async list() {
      try {
        const res = await fetchImpl(`${baseUrl}/boards`);
        if (!res.ok) return [];
        const data = (await res.json()) as { boards?: BoardView[] };
        return data.boards ?? [];
      } catch {
        return [];
      }
    },

    async edit(id, password, { body, talks, title }) {
      const reply = await post(boardPath(id), {
        password,
        body,
        ...(talks !== undefined && { talks }),
        ...(title !== undefined && { title }),
      });
      return outcomeOf(reply, ["wrong-password", "not-found", "not-assigned"] as const);
    },

    async ask(id, name, text) {
      const reply = await post(boardPath(id, "/ask"), { name, text });
      return outcomeOf(reply, ["not-found", "not-assigned"] as const);
    },

    async readQuestions(id, password) {
      const reply = await post(boardPath(id, "/questions"), { password });
      const questions = listIn(reply, "questions") as Question[] | null;
      return questions
        ? { outcome: "ok", questions }
        : { outcome: knownError(reply.json, ["wrong-password", "not-found"] as const) };
    },

    async answer(id, password, questionId, answer) {
      const reply = await post(boardPath(id, "/answer"), { password, questionId, answer });
      return outcomeOf(reply, ["wrong-password", "not-found"] as const);
    },

    async register(id, name, note) {
      const reply = await post(boardPath(id, "/register"), { name, note });
      return outcomeOf(reply, ["not-found", "not-registrable", "already-pending", "already-assigned"] as const);
    },

    async adminPending(password) {
      const reply = await post("/admin/pending", { password });
      const registrations = listIn(reply, "registrations") as AdminPendingEntry[] | null;
      return registrations
        ? { outcome: "ok", registrations }
        : { outcome: knownError(reply.json, ["wrong-password"] as const) };
    },

    async adminApprove(id, password) {
      const reply = await post(`/admin/approve/${encodeURIComponent(id)}`, { password });
      return outcomeOf(reply, ["wrong-password", "not-found", "no-pending"] as const);
    },

    async adminReject(id, password) {
      const reply = await post(`/admin/reject/${encodeURIComponent(id)}`, { password });
      return outcomeOf(reply, ["wrong-password", "not-found", "no-pending"] as const);
    },
  };
}
