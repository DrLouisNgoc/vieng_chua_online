// Each visitor's pháp danh is locked to the IP they first joined from
// (owner, 2026-11-10: "mỗi người sẽ phải để 1 pháp danh... trùng với ip
// của họ... họ chỉ được dùng 1 pháp danh này"), so reconnecting never lets
// someone pick a new name, and the old generic default ("Thiện Tâm") can
// no longer be used at all. server.ts enforces both rules; this module is
// just the ip -> name memory and the default-name check.

export { DEFAULT_NAME, isDefaultName } from "../../shared/protocol.js";

export interface VisitorNameStore {
  nameFor: (ip: string) => string | null;
  register: (ip: string, name: string) => void;
  snapshot: () => Record<string, string>;
}

export function createVisitorNameStore(seed: unknown): VisitorNameStore {
  const names = new Map<string, string>();
  if (typeof seed === "object" && seed !== null && !Array.isArray(seed)) {
    for (const [ip, name] of Object.entries(seed as Record<string, unknown>)) {
      if (typeof name === "string") names.set(ip, name);
    }
  }
  return {
    nameFor(ip) {
      return names.get(ip) ?? null;
    },
    register(ip, name) {
      names.set(ip, name);
    },
    snapshot() {
      return Object.fromEntries(names);
    },
  };
}
