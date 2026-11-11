// Shared salted-hash helpers for board passwords (boards.ts) and the
// single admin password (admin-auth.ts). Not a high-security product —
// this is a personal app for a handful of known people — but passwords
// are never stored or logged in plain text.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 32;

function hashWithSalt(password: string, salt: Buffer): string {
  return scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
}

// "saltHex:hashHex"
export function makePasswordHash(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${hashWithSalt(password, salt)}`;
}

export function isPasswordCorrect(password: string, stored: string): boolean {
  const [saltHex = "", hashHex = ""] = stored.split(":", 2);
  if (saltHex === "" || hashHex === "") return false;
  const candidate = hashWithSalt(password, Buffer.from(saltHex, "hex"));
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hashHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
