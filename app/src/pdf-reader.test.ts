import { describe, expect, it } from "vitest";

import { turnPdfPage } from "./pdf-reader";

describe("turnPdfPage", () => {
  it("moves one page forward", () => {
    expect(turnPdfPage(1, 3, 1)).toBe(2);
  });

  it("moves one page back", () => {
    expect(turnPdfPage(2, 3, -1)).toBe(1);
  });

  it("stops at the last page instead of wrapping around", () => {
    expect(turnPdfPage(3, 3, 1)).toBe(3);
  });

  it("stops at the first page instead of wrapping around", () => {
    expect(turnPdfPage(1, 3, -1)).toBe(1);
  });
});
