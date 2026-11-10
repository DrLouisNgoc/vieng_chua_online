import { describe, expect, it } from "vitest";
import { defaultBoardsUrl, defaultPresenceUrl } from "./runtime-urls";

const prodLocation = { protocol: "https:", host: "chua.io.vn", origin: "https://chua.io.vn" };
const httpLocation = { protocol: "http:", host: "example.test", origin: "http://example.test" };

describe("defaultPresenceUrl", () => {
  it("stays on localhost:8787 in dev (a different origin than Vite's own port)", () => {
    expect(defaultPresenceUrl(true, prodLocation)).toBe("ws://localhost:8787");
  });

  it("falls back to the page's own origin + /ws in a production build, wss on https", () => {
    expect(defaultPresenceUrl(false, prodLocation)).toBe("wss://chua.io.vn/ws");
  });

  it("uses plain ws on a non-https origin", () => {
    expect(defaultPresenceUrl(false, httpLocation)).toBe("ws://example.test/ws");
  });
});

describe("defaultBoardsUrl", () => {
  it("stays on localhost:8787 in dev", () => {
    expect(defaultBoardsUrl(true, prodLocation)).toBe("http://localhost:8787");
  });

  it("falls back to the page's own origin in a production build", () => {
    expect(defaultBoardsUrl(false, prodLocation)).toBe("https://chua.io.vn");
  });
});
