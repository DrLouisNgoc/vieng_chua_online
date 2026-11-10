// Fallback presence/boards server URLs when VITE_PRESENCE_URL / VITE_BOARDS_URL
// weren't set at build time (owner, 2026-11-10: the live chua.io.vn build was
// missing them — every board/cốc panel silently 404'd, see handoff.md's
// Gotchas). In dev, Vite (5173) and this app's own server (8787) are
// different origins, so the old hardcoded localhost:8787 default still
// applies. In a production build with no env var, falling back to the
// page's own origin works as long as Caddy proxies /ws*, /boards* and
// /admin* on that same domain (docs/for-owner/huong_dan/09), which the
// deploy guide already sets up — so this self-heals a build that forgot
// the env vars, instead of silently calling the visitor's own localhost.
export interface RuntimeLocation {
  protocol: string;
  host: string;
  origin: string;
}

const DEV_PRESENCE_URL = "ws://localhost:8787";
const DEV_BOARDS_URL = "http://localhost:8787";

export function defaultPresenceUrl(isDev: boolean, location: RuntimeLocation): string {
  if (isDev) return DEV_PRESENCE_URL;
  const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${location.host}/ws`;
}

export function defaultBoardsUrl(isDev: boolean, location: RuntimeLocation): string {
  if (isDev) return DEV_BOARDS_URL;
  return location.origin;
}
