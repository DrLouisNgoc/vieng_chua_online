import { describe, expect, it } from "vitest";
import { backgroundMusicEmbedUrl } from "./background-music";

// createBackgroundMusic is DOM-wiring only (no jsdom in this test
// environment, same convention as boards-panel.ts) — verified by
// screenshot per CLAUDE.md.
describe("backgroundMusicEmbedUrl", () => {
  it("builds a looping, autoplaying nocookie embed muted by default", () => {
    const url = backgroundMusicEmbedUrl("abc123", true);
    expect(url).toContain("https://www.youtube-nocookie.com/embed/abc123?");
    expect(url).toContain("autoplay=1");
    expect(url).toContain("loop=1");
    expect(url).toContain("playlist=abc123");
    expect(url).toContain("mute=1");
  });

  it("drops mute when asked to play with sound", () => {
    expect(backgroundMusicEmbedUrl("abc123", false)).toContain("mute=0");
  });
});
