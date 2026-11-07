import { createBeadCounter, type BeadCounter, type BeadStore } from "./bead-counter";
import { createBeatClock, type BeatClock } from "./beat-clock";
import { createChantSession, type ChantSession } from "./chant-session";
import { CHANTS, chantById, type ChantId } from "./chant-texts";

// The "Tu tập" controller (Milestone 7): chanting on the moktak beat with
// counts kept per chant, and moktak autoplay. Driven by update(dt) once a
// frame; talks to the avatar and sound only through PracticeDeps.

export interface PracticeDeps {
  strike: () => void;
  // Puts the avatar in its chanting pose; false when it cannot (walking,
  // holding the broom).
  startChanting: () => boolean;
  stopChanting: () => void;
  // False once the avatar has moved away and the chant should end.
  isChanting: () => boolean;
  storeFor: (id: ChantId) => BeadStore;
  onSessionChange?: (chanting: boolean) => void;
}

export interface PracticeView {
  chantId: ChantId;
  title: string;
  unit: string;
  chanting: boolean;
  line: readonly string[];
  syllable: number;
  count: number;
  autoplay: boolean;
}

export interface Practice {
  readonly view: PracticeView;
  selectChant: (id: ChantId) => void;
  toggleChant: () => void;
  toggleAutoplay: () => void;
  update: (deltaSeconds: number) => void;
}

const AUTOPLAY_BPM = 60;

export function createPractice(deps: PracticeDeps): Practice {
  const counters = new Map<ChantId, BeadCounter>();
  let chantId: ChantId = CHANTS[0]?.id ?? "adida";
  let session: ChantSession | null = null;
  let chantClock: BeatClock | null = null;
  let autoplay = false;
  const autoplayClock = createBeatClock(AUTOPLAY_BPM);

  function counter(id: ChantId): BeadCounter {
    let existing = counters.get(id);
    if (!existing) {
      existing = createBeadCounter(deps.storeFor(id));
      counters.set(id, existing);
    }
    return existing;
  }

  function endSession(): void {
    if (!session) return;
    session = null;
    chantClock = null;
    deps.onSessionChange?.(false);
  }

  return {
    get view() {
      const chant = chantById(chantId);
      const position = session?.position ?? { line: 0, syllable: -1 };
      return {
        chantId,
        title: chant.title,
        unit: chant.unit,
        chanting: session !== null,
        line: chant.lines[position.line] ?? [],
        syllable: position.syllable,
        count: counter(chantId).total,
        autoplay,
      };
    },
    selectChant(id) {
      if (!session) chantId = id;
    },
    toggleChant() {
      if (session) {
        deps.stopChanting();
        endSession();
        return;
      }
      if (!deps.startChanting()) return;
      const chant = chantById(chantId);
      session = createChantSession(chant);
      chantClock = createBeatClock(chant.bpm);
      autoplay = false;
      deps.onSessionChange?.(true);
    },
    toggleAutoplay() {
      if (session) return;
      autoplay = !autoplay;
      autoplayClock.reset();
    },
    update(deltaSeconds) {
      if (session && chantClock) {
        if (!deps.isChanting()) {
          endSession();
          return;
        }
        const beats = chantClock.advance(deltaSeconds);
        for (let i = 0; i < beats; i += 1) {
          const before = session.completed;
          session.beat();
          deps.strike();
          if (session.completed > before) counter(chantId).turn();
        }
        return;
      }
      if (autoplay) {
        const beats = autoplayClock.advance(deltaSeconds);
        for (let i = 0; i < beats; i += 1) deps.strike();
      }
    },
  };
}
