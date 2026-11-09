import { describe, it, expect } from "vitest";
import { createAdminAuth } from "./adminAuth.js";

describe("adminAuth", () => {
  it("sets the password on the first call", () => {
    const auth = createAdminAuth(null);
    expect(auth.authenticate("adminpass")).toBe("ok");
    expect(auth.snapshotHash()).toBeTruthy();
  });

  it("accepts the same password afterwards", () => {
    const auth = createAdminAuth(null);
    auth.authenticate("adminpass");
    expect(auth.authenticate("adminpass")).toBe("ok");
  });

  it("rejects a different password afterwards", () => {
    const auth = createAdminAuth(null);
    auth.authenticate("adminpass");
    expect(auth.authenticate("khac")).toBe("wrong-password");
  });

  it("starting from a persisted hash verifies without resetting it", () => {
    const first = createAdminAuth(null);
    first.authenticate("adminpass");
    const restored = createAdminAuth(first.snapshotHash());
    expect(restored.authenticate("adminpass")).toBe("ok");
    expect(restored.authenticate("sai")).toBe("wrong-password");
  });
});
