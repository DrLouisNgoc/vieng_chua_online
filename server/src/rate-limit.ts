// Fixed-window hit counter keyed by client ip, for the boards/admin HTTP
// API (boards-http.ts): caps request floods and password guessing.
// In memory only — a restart resets it, which is fine for this purpose.

export interface WindowCounter {
  // Records one hit for `key` and returns its count in the current window.
  hit: (key: string) => number;
  count: (key: string) => number;
  size: () => number;
}

export interface WindowCounterOptions {
  windowMs: number;
  now?: () => number;
  // Once this many keys are tracked, expired ones are dropped before a new
  // key is added.
  maxKeys?: number;
}

interface Window {
  start: number;
  count: number;
}

const DEFAULT_MAX_KEYS = 10_000;

export function createWindowCounter({
  windowMs,
  now = Date.now,
  maxKeys = DEFAULT_MAX_KEYS,
}: WindowCounterOptions): WindowCounter {
  const windows = new Map<string, Window>();

  const isExpired = (window: Window): boolean => now() - window.start >= windowMs;

  function dropExpired(): void {
    for (const [key, window] of windows) {
      if (isExpired(window)) windows.delete(key);
    }
  }

  function current(key: string): Window | undefined {
    const window = windows.get(key);
    return window && !isExpired(window) ? window : undefined;
  }

  return {
    hit(key) {
      const window = current(key);
      if (window) {
        window.count += 1;
        return window.count;
      }
      if (!windows.has(key) && windows.size >= maxKeys) dropExpired();
      windows.set(key, { start: now(), count: 1 });
      return 1;
    },
    count: (key) => current(key)?.count ?? 0,
    size: () => windows.size,
  };
}
