// Steps through a chant one syllable per beat, looping, and counts how
// many times the whole text has been completed. Pure.

export interface ChantPosition {
  line: number;
  // -1 before the first beat
  syllable: number;
}

export interface ChantSession {
  readonly position: ChantPosition;
  readonly completed: number;
  beat: () => void;
}

export function createChantSession(text: { lines: readonly (readonly string[])[] }): ChantSession {
  let line = 0;
  let syllable = -1;
  let completed = 0;
  const lastLine = text.lines.length - 1;

  return {
    get position() {
      return { line, syllable };
    },
    get completed() {
      return completed;
    },
    beat() {
      syllable += 1;
      if (syllable >= (text.lines[line]?.length ?? 0)) {
        syllable = 0;
        line = line >= lastLine ? 0 : line + 1;
      }
      if (line === lastLine && syllable === (text.lines[line]?.length ?? 0) - 1) {
        completed += 1;
      }
    },
  };
}
