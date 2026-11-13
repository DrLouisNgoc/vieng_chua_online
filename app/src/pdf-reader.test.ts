import { describe, expect, it } from "vitest";

import { clampPdfPage, hasText, searchPageOrder, turnPdfPage } from "./pdf-reader";

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

describe("clampPdfPage", () => {
  it("keeps a page inside the book", () => {
    expect(clampPdfPage(5, 10)).toBe(5);
  });

  it("clamps a page past either end", () => {
    expect(clampPdfPage(0, 10)).toBe(1);
    expect(clampPdfPage(99, 10)).toBe(10);
  });

  it("falls back to page 1 for a non-number", () => {
    expect(clampPdfPage(NaN, 10)).toBe(1);
  });
});

describe("searchPageOrder", () => {
  it("starts right after the current page and wraps, ending on the current page", () => {
    expect(searchPageOrder(5, 3)).toEqual([4, 5, 1, 2, 3]);
  });

  it("covers every page exactly once", () => {
    expect(searchPageOrder(4, 4)).toEqual([1, 2, 3, 4]);
  });
});

describe("hasText", () => {
  it("matches case-insensitively", () => {
    expect(hasText("Này các Tỷ-kheo", "tỷ-kheo")).toBe(true);
  });

  it("ignores extra spaces between words", () => {
    expect(hasText("địa  đại\nlà địa đại", "địa đại là")).toBe(true);
  });

  it("is false when absent or when the query is blank", () => {
    expect(hasText("Niết-bàn", "địa đại")).toBe(false);
    expect(hasText("Niết-bàn", " ".repeat(3))).toBe(false);
  });
});
