import { describe, expect, it } from "vitest";
import { bellVideoEmbedUrl } from "./bell-video";

// createBellVideo is DOM-wiring only (no jsdom in this test environment,
// same convention as background-music.ts) — verified by screenshot per
// CLAUDE.md.
describe("bellVideoEmbedUrl", () => {
  it("builds a one-shot, unmuted, autoplaying nocookie embed", () => {
    const url = bellVideoEmbedUrl("abc123", 1);
    expect(url).toContain("https://www.youtube-nocookie.com/embed/abc123?");
    expect(url).toContain("autoplay=1");
    expect(url).toContain("mute=0");
    expect(url).not.toContain("loop=1");
  });

  it("changes with the nonce, so reassigning it restarts playback", () => {
    expect(bellVideoEmbedUrl("abc123", 1)).not.toBe(bellVideoEmbedUrl("abc123", 2));
  });
});
