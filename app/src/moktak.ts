export interface MoktakControllerOptions {
  onStrike: () => void;
  autoplayIntervalMs?: number;
}

export interface MoktakController {
  readonly strikeCount: number;
  readonly isAutoplay: boolean;
  strike: () => void;
  toggleAutoplay: () => void;
  dispose: () => void;
}

const DEFAULT_AUTOPLAY_INTERVAL_MS = 1500;

export function createMoktakController(
  options: MoktakControllerOptions,
): MoktakController {
  const autoplayIntervalMs =
    options.autoplayIntervalMs ?? DEFAULT_AUTOPLAY_INTERVAL_MS;
  let strikeCount = 0;
  let autoplayTimer: ReturnType<typeof setInterval> | undefined;

  function strike(): void {
    strikeCount += 1;
    options.onStrike();
  }

  function toggleAutoplay(): void {
    if (autoplayTimer === undefined) {
      autoplayTimer = setInterval(strike, autoplayIntervalMs);
    } else {
      clearInterval(autoplayTimer);
      autoplayTimer = undefined;
    }
  }

  function dispose(): void {
    if (autoplayTimer !== undefined) {
      clearInterval(autoplayTimer);
      autoplayTimer = undefined;
    }
  }

  return {
    get strikeCount() {
      return strikeCount;
    },
    get isAutoplay() {
      return autoplayTimer !== undefined;
    },
    strike,
    toggleAutoplay,
    dispose,
  };
}
