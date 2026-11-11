import { describe, expect, it } from "vitest";

import { isPasswordCorrect, makePasswordHash } from "./password-hash.js";

describe("passwordHash", () => {
  it("verifies the correct password", () => {
    const hash = makePasswordHash("bimat123");
    expect(isPasswordCorrect("bimat123", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = makePasswordHash("bimat123");
    expect(isPasswordCorrect("sai", hash)).toBe(false);
  });

  it("never stores the password in plain text", () => {
    const hash = makePasswordHash("bimat123");
    expect(hash).not.toContain("bimat123");
  });

  it("produces a different hash each time (random salt)", () => {
    expect(makePasswordHash("bimat123")).not.toBe(makePasswordHash("bimat123"));
  });
});
