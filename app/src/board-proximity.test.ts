import { describe, it, expect } from "vitest";
import { nearestBoardId } from "./board-proximity";
import { COC_SPOTS, HALL_PROJECTOR, SUTRA_SPOT } from "./temple-layout";

describe("nearestBoardId", () => {
  it("is null far from every board", () => {
    expect(nearestBoardId({ x: 0, z: 0 })).toBeNull();
  });

  it("finds a cốc when standing right on it", () => {
    const spot = COC_SPOTS[0];
    expect(spot).toBeDefined();
    if (!spot) return;
    expect(nearestBoardId({ x: spot.x, z: spot.z })).toBe(spot.id);
  });

  it("finds the hall projector when close", () => {
    expect(nearestBoardId({ x: HALL_PROJECTOR.x, z: HALL_PROJECTOR.z })).toBe("may-chieu-chanh-dien");
  });

  it("finds the Đọc Kinh Nikaya spot when close", () => {
    expect(nearestBoardId({ x: SUTRA_SPOT.x, z: SUTRA_SPOT.z })).toBe("doc-kinh");
  });

  it("is null just outside the reach of every board", () => {
    const spot = COC_SPOTS[0];
    expect(spot).toBeDefined();
    if (!spot) return;
    expect(nearestBoardId({ x: spot.x + 50, z: spot.z + 50 })).toBeNull();
  });
});
