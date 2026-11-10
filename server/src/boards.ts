// Content boards (cốc + hall projector). Everyone can read a board;
// editing it needs its password.
//
// Fixed boards (registrable: false — the 4 named cốc and the hall
// projector): the first edit on the board sets its password. The owner
// performs that first edit themselves and hands the password to whoever
// the cốc belongs to.
//
// Open cốc (registrable: true): start empty, no occupant. Anyone can
// register (name + note); the owner approves or rejects via the admin
// password (adminAuth.ts). Only once approved can the occupant edit it
// (which, like a fixed board, sets its password on that first edit).
import { makePasswordHash, verifyPassword } from "./passwordHash.js";

export type BoardType = "text" | "video" | "image";

export interface BoardSeed {
  id: string;
  title: string;
  type: BoardType;
  registrable: boolean;
  // false for the one shared board anyone can edit with no password (the
  // hall projector's talk list). Defaults to true for every other board.
  requiresPassword?: boolean;
  // Starting content for a board that has never been persisted yet.
  // Ignored once the board exists in the data file (mergeWithSeed keeps
  // the persisted body) — defaults to "".
  body?: string;
  // A second, independent content field: the 4 named cốc's own "bài
  // giảng" talk list (owner, 2026-11-10: "xem bài giảng của các vị trong
  // cốc"), same one-line-per-talk format as the hall projector's body
  // ("Tên bài | link"), edited with the same password. Only the UI
  // decides which boards show this (named text cốc) — the store itself
  // treats it the same for every board. Defaults to "".
  talks?: string;
}

export interface PendingRegistration {
  name: string;
  note: string;
}

// A question a visitor left for this board's occupant (owner, 2026-11-10:
// "ấn vào để hỏi pháp"). Private: only readQuestions, with the board's own
// password, can see these — never exposed via list/get.
export interface Question {
  name: string;
  text: string;
}

// A talk's worth of questions is plenty; oldest drop first past this.
const MAX_QUESTIONS_PER_BOARD = 100;

export interface PublicBoard {
  id: string;
  title: string;
  type: BoardType;
  body: string;
  talks: string;
  registrable: boolean;
  requiresPassword: boolean;
  occupantName: string | null;
  // Someone's name, once registered and awaiting the owner's decision —
  // visible publicly so a second visitor knows not to also register; the
  // note they wrote is admin-only (see AdminPendingEntry).
  pendingName: string | null;
}

export interface StoredBoard {
  id: string;
  title: string;
  type: BoardType;
  body: string;
  talks: string;
  passwordHash: string | null;
  registrable: boolean;
  requiresPassword: boolean;
  occupantName: string | null;
  pending: PendingRegistration | null;
  questions: Question[];
}

export interface AdminPendingEntry {
  id: string;
  title: string;
  name: string;
  note: string;
}

export type EditResult = "ok" | "wrong-password" | "not-found" | "not-assigned";
export type RegisterResult = "ok" | "not-found" | "not-registrable" | "already-pending" | "already-assigned";
export type DecisionResult = "ok" | "not-found" | "no-pending";
export type AskResult = "ok" | "not-found" | "not-assigned";
export type ReadQuestionsResult =
  | { outcome: "ok"; questions: Question[] }
  | { outcome: "wrong-password" }
  | { outcome: "not-found" };

export interface BoardStore {
  list: () => PublicBoard[];
  get: (id: string) => PublicBoard | undefined;
  // title: only applied when given and non-empty — lets the occupant (or
  // owner) rename their own cốc (owner, 2026-11-10: "update các cốc trong
  // đó bao gồm tên và nội dung") without blanking it out.
  edit: (id: string, password: string, body: string, talks?: string, title?: string) => EditResult;
  register: (id: string, name: string, note: string) => RegisterResult;
  listPending: () => AdminPendingEntry[];
  approve: (id: string) => DecisionResult;
  reject: (id: string) => DecisionResult;
  // Anyone can leave a question for the board's occupant to read later.
  ask: (id: string, name: string, text: string) => AskResult;
  // Only with the board's own password — same one edit uses.
  readQuestions: (id: string, password: string) => ReadQuestionsResult;
  // The on-disk shape, password hashes included — for persistence only.
  snapshot: () => StoredBoard[];
}

function toPublic(board: StoredBoard): PublicBoard {
  const { id, title, type, body, talks, registrable, requiresPassword, occupantName, pending } = board;
  return {
    id,
    title,
    type,
    body,
    talks,
    registrable,
    requiresPassword,
    occupantName,
    pendingName: pending?.name ?? null,
  };
}

export function seedBoards(seeds: readonly BoardSeed[]): StoredBoard[] {
  return seeds.map((seed) => ({
    ...seed,
    requiresPassword: seed.requiresPassword ?? true,
    body: seed.body ?? "",
    talks: seed.talks ?? "",
    passwordHash: null,
    occupantName: null,
    pending: null,
    questions: [],
  }));
}

export function createBoardStore(initial: readonly StoredBoard[]): BoardStore {
  const boards = new Map(initial.map((board) => [board.id, { ...board }]));

  return {
    list: () => [...boards.values()].map(toPublic),
    get: (id) => {
      const board = boards.get(id);
      return board ? toPublic(board) : undefined;
    },
    edit(id, password, body, talks, title) {
      const board = boards.get(id);
      if (!board) return "not-found";
      if (board.registrable && board.occupantName === null) return "not-assigned";
      if (board.requiresPassword) {
        if (board.passwordHash === null) {
          board.passwordHash = makePasswordHash(password);
        } else if (!verifyPassword(password, board.passwordHash)) {
          return "wrong-password";
        }
      }
      board.body = body;
      if (talks !== undefined) board.talks = talks;
      const trimmedTitle = title?.trim();
      if (trimmedTitle) board.title = trimmedTitle;
      return "ok";
    },
    register(id, name, note) {
      const board = boards.get(id);
      if (!board) return "not-found";
      if (!board.registrable) return "not-registrable";
      if (board.occupantName !== null) return "already-assigned";
      if (board.pending !== null) return "already-pending";
      board.pending = { name, note };
      return "ok";
    },
    listPending: () =>
      [...boards.values()]
        .filter((board): board is StoredBoard & { pending: PendingRegistration } => board.pending !== null)
        .map((board) => ({ id: board.id, title: board.title, name: board.pending.name, note: board.pending.note })),
    approve(id) {
      const board = boards.get(id);
      if (!board) return "not-found";
      if (board.pending === null) return "no-pending";
      board.occupantName = board.pending.name;
      board.pending = null;
      return "ok";
    },
    reject(id) {
      const board = boards.get(id);
      if (!board) return "not-found";
      if (board.pending === null) return "no-pending";
      board.pending = null;
      return "ok";
    },
    ask(id, name, text) {
      const board = boards.get(id);
      if (!board) return "not-found";
      if (board.registrable && board.occupantName === null) return "not-assigned";
      board.questions.push({ name, text });
      if (board.questions.length > MAX_QUESTIONS_PER_BOARD) board.questions.shift();
      return "ok";
    },
    readQuestions(id, password) {
      const board = boards.get(id);
      if (!board) return { outcome: "not-found" };
      if (board.requiresPassword && (board.passwordHash === null || !verifyPassword(password, board.passwordHash))) {
        return { outcome: "wrong-password" };
      }
      return { outcome: "ok", questions: board.questions };
    },
    snapshot: () => [...boards.values()].map((board) => ({ ...board })),
  };
}

function isPendingRegistration(value: unknown): value is PendingRegistration {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && typeof v.note === "string";
}

function isQuestion(value: unknown): value is Question {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && typeof v.text === "string";
}

function isStoredBoard(value: unknown): value is StoredBoard {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    (v.type === "text" || v.type === "video" || v.type === "image") &&
    typeof v.body === "string" &&
    // Added after boards.json files already existed on a live deploy —
    // both stay optional here so an older file still merges cleanly
    // (mergeWithSeed fills in "" / [] for whichever is missing).
    (v.talks === undefined || typeof v.talks === "string") &&
    (v.passwordHash === null || typeof v.passwordHash === "string") &&
    typeof v.registrable === "boolean" &&
    (v.requiresPassword === undefined || typeof v.requiresPassword === "boolean") &&
    (v.occupantName === null || typeof v.occupantName === "string") &&
    (v.pending === null || isPendingRegistration(v.pending)) &&
    (v.questions === undefined || (Array.isArray(v.questions) && v.questions.every(isQuestion)))
  );
}

// Keeps a persisted board's body/password/occupant when its id is still
// seeded, adds fresh boards for new seed ids, and drops boards no longer
// seeded.
export function mergeWithSeed(persisted: unknown, seeds: readonly BoardSeed[]): StoredBoard[] {
  const byId = new Map(
    Array.isArray(persisted) ? persisted.filter(isStoredBoard).map((board) => [board.id, board]) : [],
  );
  return seeds.map((seed) => {
    const existing = byId.get(seed.id);
    const requiresPassword = seed.requiresPassword ?? true;
    return existing
      ? {
          ...seed,
          // Once persisted, a renamed cốc's title sticks (same rule as
          // body below) rather than reverting to the seed's name.
          title: existing.title,
          requiresPassword,
          body: existing.body,
          talks: existing.talks ?? "",
          passwordHash: existing.passwordHash,
          occupantName: existing.occupantName,
          pending: existing.pending,
          questions: existing.questions ?? [],
        }
      : {
          ...seed,
          requiresPassword,
          body: seed.body ?? "",
          talks: seed.talks ?? "",
          passwordHash: null,
          occupantName: null,
          pending: null,
          questions: [],
        };
  });
}

export const BOARD_SEEDS: BoardSeed[] = [
  { id: "coc-co-chi-yen", title: "Cốc Cô Yến", type: "text", registrable: false },
  { id: "coc-anh-tuan-ha", title: "Cốc Anh Tuấn Hà", type: "text", registrable: false },
  { id: "coc-su-phu", title: "Cốc Sư Nguyên Tuệ", type: "text", registrable: false },
  { id: "coc-cua-toi", title: "Cốc Khánh", type: "text", registrable: false },
  {
    id: "may-chieu-chanh-dien",
    title: "Bài giảng Thầy Nguyên Tuệ",
    type: "video",
    registrable: false,
    requiresPassword: false,
    body: "Bài giảng Thầy Nguyên Tuệ | https://www.youtube.com/watch?v=VsfXrl13dI4&t=4s",
  },
  { id: "coc-mo-1", title: "Cốc Thuyết Pháp 1", type: "text", registrable: true },
  { id: "coc-mo-2", title: "Cốc Thuyết Pháp 2", type: "text", registrable: true },
  { id: "coc-mo-3", title: "Cốc Thuyết Pháp 3", type: "text", registrable: true },
  { id: "coc-mo-4", title: "Cốc Thuyết Pháp 4", type: "text", registrable: true },
  {
    id: "loi-phap-chanh-dien",
    title: "Lời Pháp Chánh Điện",
    type: "image",
    registrable: false,
    // One line per photo: "tên-file.jpg | Chú thích (không bắt buộc)".
    // Files go in app/public/thirdparty/phap-cu/ (decision 0009, owner's
    // own photos of câu pháp cú/kinh — not text this app writes).
    body: "",
  },
];
