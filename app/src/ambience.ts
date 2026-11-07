// Background sound and bells from optional CC0 files (decision 0009,
// docs/assets/third-party-assets.md). A missing file only warns once: the
// temple works silently without them.

const AUDIO_ROOT = "/thirdparty/audio";
export const AMBIENCE_FILES = {
  ambience: `${AUDIO_ROOT}/ambience-countryside.mp3`,
  bell: `${AUDIO_ROOT}/bell-gong.mp3`,
  bowl: `${AUDIO_ROOT}/bowl-struck.mp3`,
} as const;

const AMBIENCE_VOLUME = 0.35;

export interface Ambience {
  readonly ambienceOn: boolean;
  setAmbienceOn: (on: boolean) => void;
  ringBell: () => void;
  strikeBowl: () => void;
}

function createSound(url: string, loop = false): HTMLAudioElement {
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.loop = loop;
  audio.addEventListener("error", () => {
    if (missing.has(audio)) return;
    missing.add(audio);
    console.warn(`Sound file not available (add it to app/public${url}):`, url);
  });
  return audio;
}

// Sounds whose file failed to load: skipped silently after one warning.
const missing = new WeakSet<HTMLAudioElement>();

function play(audio: HTMLAudioElement, restart: boolean): void {
  if (missing.has(audio)) return;
  if (restart) audio.currentTime = 0;
  audio.play().catch((error: unknown) => {
    console.warn("Sound could not play:", error);
  });
}

export function createAmbience(): Ambience {
  const ambience = createSound(AMBIENCE_FILES.ambience, true);
  ambience.volume = AMBIENCE_VOLUME;
  const bell = createSound(AMBIENCE_FILES.bell);
  const bowl = createSound(AMBIENCE_FILES.bowl);
  let ambienceOn = false;

  return {
    get ambienceOn() {
      return ambienceOn;
    },
    setAmbienceOn(on) {
      ambienceOn = on;
      if (on) play(ambience, false);
      else ambience.pause();
    },
    ringBell: () => play(bell, true),
    strikeBowl: () => play(bowl, true),
  };
}
