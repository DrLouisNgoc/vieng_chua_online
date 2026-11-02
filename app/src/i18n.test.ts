import { describe, it, expect } from "vitest";
import { t } from "./i18n";

describe("t", () => {
  it("returns the Vietnamese string for a known key", () => {
    expect(t("목탁 두드리기")).toBe("Gõ mõ");
  });

  it("falls back to the key itself for an untranslated string", () => {
    expect(t("chuỗi không có trong bảng")).toBe("chuỗi không có trong bảng");
  });
});
