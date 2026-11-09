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

export type BoardType = "text" | "video";

export interface BoardSeed {
  id: string;
  title: string;
  type: BoardType;
  registrable: boolean;
}

export interface PendingRegistration {
  name: string;
  note: string;
}

export interface PublicBoard {
  id: string;
  title: string;
  type: BoardType;
  body: string;
  registrable: boolean;
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
  passwordHash: string | null;
  registrable: boolean;
  occupantName: string | null;
  pending: PendingRegistration | null;
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

export interface BoardStore {
  list: () => PublicBoard[];
  get: (id: string) => PublicBoard | undefined;
  edit: (id: string, password: string, body: string) => EditResult;
  register: (id: string, name: string, note: string) => RegisterResult;
  listPending: () => AdminPendingEntry[];
  approve: (id: string) => DecisionResult;
  reject: (id: string) => DecisionResult;
  // The on-disk shape, password hashes included — for persistence only.
  snapshot: () => StoredBoard[];
}

function toPublic(board: StoredBoard): PublicBoard {
  const { id, title, type, body, registrable, occupantName, pending } = board;
  return { id, title, type, body, registrable, occupantName, pendingName: pending?.name ?? null };
}

export function seedBoards(seeds: readonly BoardSeed[]): StoredBoard[] {
  return seeds.map((seed) => ({
    ...seed,
    body: "",
    passwordHash: null,
    occupantName: null,
    pending: null,
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
    edit(id, password, body) {
      const board = boards.get(id);
      if (!board) return "not-found";
      if (board.registrable && board.occupantName === null) return "not-assigned";
      if (board.passwordHash === null) {
        board.passwordHash = makePasswordHash(password);
      } else if (!verifyPassword(password, board.passwordHash)) {
        return "wrong-password";
      }
      board.body = body;
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
    snapshot: () => [...boards.values()].map((board) => ({ ...board })),
  };
}

function isPendingRegistration(value: unknown): value is PendingRegistration {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && typeof v.note === "string";
}

function isStoredBoard(value: unknown): value is StoredBoard {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    (v.type === "text" || v.type === "video") &&
    typeof v.body === "string" &&
    (v.passwordHash === null || typeof v.passwordHash === "string") &&
    typeof v.registrable === "boolean" &&
    (v.occupantName === null || typeof v.occupantName === "string") &&
    (v.pending === null || isPendingRegistration(v.pending))
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
    return existing
      ? {
          ...seed,
          body: existing.body,
          passwordHash: existing.passwordHash,
          occupantName: existing.occupantName,
          pending: existing.pending,
        }
      : { ...seed, body: "", passwordHash: null, occupantName: null, pending: null };
  });
}

export const BOARD_SEEDS: BoardSeed[] = [
  { id: "coc-co-chi-yen", title: "Cốc Cô Yến", type: "text", registrable: false },
  { id: "coc-anh-tuan-ha", title: "Cốc Anh Tuấn Hà", type: "text", registrable: false },
  { id: "coc-su-phu", title: "Cốc Sư Nguyên Tuệ", type: "text", registrable: false },
  { id: "coc-cua-toi", title: "Cốc Khánh", type: "text", registrable: false },
  { id: "may-chieu-chanh-dien", title: "Bài giảng Thầy Nguyên Tuệ", type: "video", registrable: false },
  { id: "coc-mo-1", title: "Cốc Thuyết Pháp 1", type: "text", registrable: true },
  { id: "coc-mo-2", title: "Cốc Thuyết Pháp 2", type: "text", registrable: true },
  { id: "coc-mo-3", title: "Cốc Thuyết Pháp 3", type: "text", registrable: true },
  { id: "coc-mo-4", title: "Cốc Thuyết Pháp 4", type: "text", registrable: true },
];
