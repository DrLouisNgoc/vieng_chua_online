import { describe, it, expect } from "vitest";
import { makePasswordHash, verifyPassword } from "./passwordHash.js";

describe("passwordHash", () => {
  it("verifies the correct password", () => {
    const hash = makePasswordHash("bimat123");
    expect(verifyPassword("bimat123", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = makePasswordHash("bimat123");
    expect(verifyPassword("sai", hash)).toBe(false);
  });

  it("never stores the password in plain text", () => {
    const hash = makePasswordHash("bimat123");
    expect(hash).not.toContain("bimat123");
  });

  it("produces a different hash each time (random salt)", () => {
    expect(makePasswordHash("bimat123")).not.toBe(makePasswordHash("bimat123"));
  });
});
