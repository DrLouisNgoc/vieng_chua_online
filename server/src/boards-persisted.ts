// Reading boards.json: validates the persisted shape (untrusted, possibly
// written by an older version) and merges it with the current seeds.
import type { BoardSeed, BoardType, PendingRegistration, Question, StoredBoard } from "./boards.js";
import { BOARD_TYPES } from "./boards.js";
// A question as read from boards.json: id/answer were added after some
// files already had questions (live-deploy backward-compat rule).
type PersistedQuestion = Omit<Question, "id" | "answer"> & { id?: string; answer?: string | null };

// A board as read from boards.json: talks, requiresPassword and questions
// were added after files already existed on a live deploy, so an older file
// may lack them (mergeWithSeed fills in the defaults).
type PersistedBoard = Omit<StoredBoard, "talks" | "requiresPassword" | "questions"> & {
  talks?: string;
  requiresPassword?: boolean;
  questions?: PersistedQuestion[];
};

function isPendingRegistration(value: unknown): value is PendingRegistration {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && typeof v.note === "string";
}

const isOptionalString = (value: unknown): boolean => value === undefined || typeof value === "string";
const isNullableString = (value: unknown): boolean => value === null || typeof value === "string";

function isPersistedQuestion(value: unknown): value is PersistedQuestion {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.text === "string" &&
    isOptionalString(v.id) &&
    (v.answer === undefined || isNullableString(v.answer))
  );
}

function normalizeQuestion(question: PersistedQuestion): Question {
  return {
    id: question.id ?? crypto.randomUUID(),
    name: question.name,
    text: question.text,
    answer: question.answer ?? null,
  };
}

function hasBoardContent(v: Record<string, unknown>): boolean {
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    BOARD_TYPES.includes(v.type as BoardType) &&
    typeof v.body === "string" &&
    isOptionalString(v.talks) &&
    (v.questions === undefined ||
      (Array.isArray(v.questions) && v.questions.every((question) => isPersistedQuestion(question))))
  );
}

function hasBoardAccess(v: Record<string, unknown>): boolean {
  return (
    isNullableString(v.passwordHash) &&
    typeof v.registrable === "boolean" &&
    (v.requiresPassword === undefined || typeof v.requiresPassword === "boolean") &&
    isNullableString(v.occupantName) &&
    (v.pending === null || isPendingRegistration(v.pending))
  );
}

function isPersistedBoard(value: unknown): value is PersistedBoard {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return hasBoardContent(v) && hasBoardAccess(v);
}

// Keeps a persisted board's body/password/occupant when its id is still
// seeded, adds fresh boards for new seed ids, and drops boards no longer
// seeded.
export function mergeWithSeed(persisted: unknown, seeds: readonly BoardSeed[]): StoredBoard[] {
  const byId = new Map(
    Array.isArray(persisted)
      ? persisted.filter((board) => isPersistedBoard(board)).map((board) => [board.id, board])
      : [],
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
          questions: (existing.questions ?? []).map((question) => normalizeQuestion(question)),
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
