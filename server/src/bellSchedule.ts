// How long until the bell's next scheduled toll, aligned to the wall clock
// rather than to whenever the server happened to start (owner, 2026-11-10:
// "âm thanh chuông tự động đánh theo giờ đồng hồ"). Epoch-ms is already a
// multiple of an hour at every whole clock hour in every whole-hour-offset
// timezone (Vietnam is UTC+7), so the next multiple of intervalMs since the
// epoch is the next top-of-hour.
export function msUntilNextBoundary(intervalMs: number, nowMs: number): number {
  const remainder = nowMs % intervalMs;
  return remainder === 0 ? 0 : intervalMs - remainder;
}
