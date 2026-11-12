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
  setAmbienceOn: (isOn: boolean) => void;
  ringBell: () => void;
  strikeBowl: () => void;
}

interface Sound {
  play: (shouldRestart: boolean) => Promise<void>;
  pause: () => void;
}

interface SoundOptions {
  isLooping?: boolean;
  volume?: number;
}

// A sound whose file failed to load is skipped silently after one warning.
function createSound(url: string, { isLooping = false, volume }: SoundOptions = {}): Sound {
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.loop = isLooping;
  if (volume !== undefined) audio.volume = volume;
  let isMissing = false;
  audio.addEventListener("error", () => {
    if (isMissing) return;
    isMissing = true;
    console.warn(`Sound file not available (add it to app/public${url}):`, url);
  });
  return {
    async play(shouldRestart) {
      if (isMissing) return;
      if (shouldRestart) audio.currentTime = 0;
      try {
        await audio.play();
      } catch (error: unknown) {
        console.warn("Sound could not play:", error);
      }
    },
    pause() {
      audio.pause();
    },
  };
}

export function createAmbience(): Ambience {
  const ambience = createSound(AMBIENCE_FILES.ambience, { isLooping: true, volume: AMBIENCE_VOLUME });
  const bell = createSound(AMBIENCE_FILES.bell);
  const bowl = createSound(AMBIENCE_FILES.bowl);
  let isAmbienceOn = false;

  return {
    get ambienceOn() {
      return isAmbienceOn;
    },
    async setAmbienceOn(isOn) {
      isAmbienceOn = isOn;
      if (isOn) await ambience.play(false);
      else ambience.pause();
    },
    ringBell: async () => bell.play(true),
    strikeBowl: async () => bowl.play(true),
  };
}
