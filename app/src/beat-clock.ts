// Turns frame time into beats at a tempo: the first beat falls at once,
// then one every 60 / bpm seconds. Pure.

export interface BeatClock {
  // Returns how many beats fell within this step.
  advance: (deltaSeconds: number) => number;
  reset: () => void;
}

export function createBeatClock(bpm: number): BeatClock {
  const interval = 60 / bpm;
  let untilNext = 0;
  return {
    advance(deltaSeconds) {
      untilNext -= deltaSeconds;
      let beats = 0;
      while (untilNext <= 0) {
        beats += 1;
        untilNext += interval;
      }
      return beats;
    },
    reset() {
      untilNext = 0;
    },
  };
}
