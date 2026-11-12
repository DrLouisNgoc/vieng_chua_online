// The server validates every client message against shared/protocol.ts.
// These pin the app's own layout and palette to the same numbers, so a
// cushion or robe colour added on one side cannot silently be refused by
// the other.
import { describe, expect, it } from "vitest";

import { ROBE_COLOR_COUNT, SEAT_COUNT, WORLD_LIMIT } from "../../shared/protocol";
import { ROBE_COLORS } from "./onboarding";
import { MEDITATION_SEATS, WORLD_LIMIT as LAYOUT_WORLD_LIMIT } from "./temple-layout";

describe("app matches the shared protocol", () => {
  it("has exactly as many seats as the server accepts seat indexes", () => {
    expect(MEDITATION_SEATS).toHaveLength(SEAT_COUNT);
  });

  it("offers exactly as many robe colours as the server accepts", () => {
    expect(ROBE_COLORS).toHaveLength(ROBE_COLOR_COUNT);
  });

  it("keeps visitors inside the coordinates the server accepts", () => {
    expect(LAYOUT_WORLD_LIMIT).toBe(WORLD_LIMIT);
  });
});
