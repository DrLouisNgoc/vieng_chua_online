// Fetch wrapper for the server's boards HTTP API (server/src/boardsHttp.ts).
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
      return { title: title || url, url };
    });
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
      if (bar === -1) return { file: line, caption: "" };
      return { file: line.slice(0, bar).trim(), caption: line.slice(bar + 1).trim() };
    });
}

// The "Đọc Kinh Nikaya" board's body reuses the exact same "Tên | link"
// format as the bài giảng board (parseTalks) — the owner's own curated
// links (interviewed 2026-11-10: "nguồn nikaya... trung bộ kinh",
// budsas.org) to a sutta's own page, never this app's own copy of the
// (copyrighted) translated text.

// Deterministic by local calendar day, so every visitor sees the same one
// that day and it changes automatically at local midnight — no server
// involvement needed (owner, 2026-11-10: "mỗi ngày sẽ tự động hiện lên 1
// bài kinh hay").
export function sutraOfTheDay(sutras: Talk[], now: Date = new Date()): Talk | null {
  if (sutras.length === 0) return null;
  const dayIndex = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  return sutras[((dayIndex % sutras.length) + sutras.length) % sutras.length] ?? null;
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
export type RegisterOutcome =
  | "ok"
  | "not-found"
  | "not-registrable"
  | "already-pending"
  | "already-assigned"
  | "error";
export type AdminDecisionOutcome = "ok" | "wrong-password" | "not-found" | "no-pending" | "error";
export type AdminPendingResult =
  | { outcome: "ok"; registrations: AdminPendingEntry[] }
  | { outcome: "wrong-password" | "error" };
export type AskOutcome = "ok" | "not-found" | "not-assigned" | "error";
export type AnswerOutcome = "ok" | "wrong-password" | "not-found" | "error";
export type ReadQuestionsResult =
  | { outcome: "ok"; questions: Question[] }
  | { outcome: "wrong-password" | "not-found" | "error" };

export interface BoardsClient {
  list: () => Promise<BoardView[]>;
  edit: (id: string, password: string, body: string, talks?: string, title?: string) => Promise<EditOutcome>;
  register: (id: string, name: string, note: string) => Promise<RegisterOutcome>;
  ask: (id: string, name: string, text: string) => Promise<AskOutcome>;
  readQuestions: (id: string, password: string) => Promise<ReadQuestionsResult>;
  answer: (id: string, password: string, questionId: string, answer: string) => Promise<AnswerOutcome>;
  adminPending: (password: string) => Promise<AdminPendingResult>;
  adminApprove: (id: string, password: string) => Promise<AdminDecisionOutcome>;
  adminReject: (id: string, password: string) => Promise<AdminDecisionOutcome>;
}

function errorField(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const error = (json as Record<string, unknown>).error;
  return typeof error === "string" ? error : null;
}

export function createBoardsClient(baseUrl: string, fetchImpl: typeof fetch = fetch): BoardsClient {
  async function postJson(path: string, body: unknown): Promise<{ status: number; json: unknown }> {
    try {
      const res = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      return { status: res.status, json };
    } catch {
      return { status: 0, json: null };
    }
  }

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

    async edit(id, password, body, talks, title) {
      const { status, json } = await postJson(`/boards/${encodeURIComponent(id)}`, {
        password,
        body,
        ...(talks !== undefined ? { talks } : {}),
        ...(title !== undefined ? { title } : {}),
      });
      if (status === 200) return "ok";
      const error = errorField(json);
      if (error === "wrong-password" || error === "not-found" || error === "not-assigned") return error;
      return "error";
    },

    async ask(id, name, text) {
      const { status, json } = await postJson(`/boards/${encodeURIComponent(id)}/ask`, { name, text });
      if (status === 200) return "ok";
      const error = errorField(json);
      if (error === "not-found" || error === "not-assigned") return error;
      return "error";
    },

    async readQuestions(id, password) {
      const { status, json } = await postJson(`/boards/${encodeURIComponent(id)}/questions`, { password });
      if (status === 200 && typeof json === "object" && json !== null) {
        const questions = (json as { questions?: Question[] }).questions;
        if (Array.isArray(questions)) return { outcome: "ok", questions };
      }
      const error = errorField(json);
      if (error === "wrong-password" || error === "not-found") return { outcome: error };
      return { outcome: "error" };
    },

    async answer(id, password, questionId, answer) {
      const { status, json } = await postJson(`/boards/${encodeURIComponent(id)}/answer`, {
        password,
        questionId,
        answer,
      });
      if (status === 200) return "ok";
      const error = errorField(json);
      if (error === "wrong-password" || error === "not-found") return error;
      return "error";
    },

    async register(id, name, note) {
      const { status, json } = await postJson(`/boards/${encodeURIComponent(id)}/register`, { name, note });
      if (status === 200) return "ok";
      const error = errorField(json);
      if (
        error === "not-found" ||
        error === "not-registrable" ||
        error === "already-pending" ||
        error === "already-assigned"
      ) {
        return error;
      }
      return "error";
    },

    async adminPending(password) {
      const { status, json } = await postJson("/admin/pending", { password });
      if (status === 200 && typeof json === "object" && json !== null) {
        const registrations = (json as { registrations?: AdminPendingEntry[] }).registrations;
        if (Array.isArray(registrations)) return { outcome: "ok", registrations };
      }
      if (errorField(json) === "wrong-password") return { outcome: "wrong-password" };
      return { outcome: "error" };
    },

    async adminApprove(id, password) {
      const { status, json } = await postJson(`/admin/approve/${encodeURIComponent(id)}`, { password });
      if (status === 200) return "ok";
      const error = errorField(json);
      if (error === "wrong-password" || error === "not-found" || error === "no-pending") return error;
      return "error";
    },

    async adminReject(id, password) {
      const { status, json } = await postJson(`/admin/reject/${encodeURIComponent(id)}`, { password });
      if (status === 200) return "ok";
      const error = errorField(json);
      if (error === "wrong-password" || error === "not-found" || error === "no-pending") return error;
      return "error";
    },
  };
}
