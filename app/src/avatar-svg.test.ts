import { describe, it, expect } from "vitest";
import { renderAvatarSvg } from "./avatar-svg";

describe("renderAvatarSvg", () => {
  it("embeds the given gender as the data-look attribute", () => {
    expect(renderAvatarSvg("nam")).toContain('data-look="nam"');
    expect(renderAvatarSvg("nu")).toContain('data-look="nu"');
  });

  it("is a well-formed svg root with the expected viewBox", () => {
    const svg = renderAvatarSvg("nam");
    expect(svg).toContain('<svg class="va-figure"');
    expect(svg).toContain('viewBox="0 0 140 170"');
    expect(svg.trim().endsWith("</svg>")).toBe(true);
  });
});
