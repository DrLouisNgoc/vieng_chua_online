// Fetch wrapper for the server's boards HTTP API (server/src/boardsHttp.ts).
// Every method resolves, never throws — network/parse failures become the
// "error" outcome so callers (boards-panel.ts) can show one message.

export type BoardType = "text" | "video";

export interface BoardView {
  id: string;
  title: string;
  type: BoardType;
  body: string;
  registrable: boolean;
  occupantName: string | null;
  pendingName: string | null;
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

export interface BoardsClient {
  list: () => Promise<BoardView[]>;
  edit: (id: string, password: string, body: string) => Promise<EditOutcome>;
  register: (id: string, name: string, note: string) => Promise<RegisterOutcome>;
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

    async edit(id, password, body) {
      const { status, json } = await postJson(`/boards/${encodeURIComponent(id)}`, { password, body });
      if (status === 200) return "ok";
      const error = errorField(json);
      if (error === "wrong-password" || error === "not-found" || error === "not-assigned") return error;
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
