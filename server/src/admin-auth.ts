// One global admin password, gating the registration-approval panel. The
// owner's first login sets it (their own choice); after that it must
// match. Separate from any board's own password (boards.ts).
import { makePasswordHash, verifyPassword } from "./password-hash.js";

export type AuthResult = "ok" | "wrong-password";

export interface AdminAuth {
  authenticate: (password: string) => AuthResult;
  // The on-disk hash — for persistence only.
  snapshotHash: () => string | null;
}

export function createAdminAuth(initialHash: string | null): AdminAuth {
  let hash = initialHash;
  return {
    authenticate(password) {
      if (hash === null) {
        hash = makePasswordHash(password);
        return "ok";
      }
      return verifyPassword(password, hash) ? "ok" : "wrong-password";
    },
    snapshotHash: () => hash,
  };
}
