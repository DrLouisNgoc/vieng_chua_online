export interface MoktakControllerOptions {
  onStrike: () => void;
}

export interface MoktakController {
  readonly strikeCount: number;
  strike: () => void;
}

export function createMoktakController(
  options: MoktakControllerOptions,
): MoktakController {
  let strikeCount = 0;

  function strike(): void {
    strikeCount += 1;
    options.onStrike();
  }

  return {
    get strikeCount() {
      return strikeCount;
    },
    strike,
  };
}
