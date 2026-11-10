// The one copy of every rule the browser and the server must agree on
// (decision 0012's tech-debt plan). Imported by app/ (Vite, extensionless)
// and server/ (NodeNext, "../../shared/protocol.js"). No imports, no
// DOM or Node APIs: plain values and pure functions only.
//
// app/src/shared-protocol.test.ts pins the app's seat layout and robe
// palette to these numbers.

export const MAX_NAME_LENGTH = 24;
export const MAX_CHAT_LENGTH = 300;
export const ROBE_COLOR_COUNT = 6;
// 16 x 24 hall cushions + 4 banyan seats: MEDITATION_SEATS in app/src/temple-layout.ts.
export const SEAT_COUNT = 388;
// How far from the centre any visitor can be, on each axis.
export const WORLD_LIMIT = 300;

export const ACTIVITIES = ["idle", "walking", "seated", "greeting", "bowing", "beads", "chanting"] as const;
export type Activity = (typeof ACTIVITIES)[number];

// The old generic default every visitor used to start with — now forbidden
// outright (owner, 2026-11-10: "ko được để pháp danh mặc định là thiện tâm
// nữa"). The app checks it for instant feedback; the server enforces it.
export const DEFAULT_NAME = "Thiện Tâm";

// Case- and diacritic-insensitive, so "thien tam" counts too: NFD splits
// "ệ" into "e" + combining marks, and the class strips U+0300–U+036F.
function normalizeName(name: string): string {
  return name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function isDefaultName(name: string): boolean {
  return normalizeName(name) === normalizeName(DEFAULT_NAME);
}
