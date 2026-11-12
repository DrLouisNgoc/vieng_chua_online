import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AMBIENCE_FILES, createAmbience } from "./ambience";

// A stand-in for HTMLAudioElement: the node test runner has no Audio.
class FakeAudio extends EventTarget {
  static readonly created: FakeAudio[] = [];

  preload = "";

  loop = false;

  volume = 1;

  currentTime = 5;

  plays = 0;

  pauses = 0;

  isBlocked = false;

  readonly src: string;

  constructor(src: string) {
    super();
    this.src = src;
    FakeAudio.created.push(this);
  }

  async play(): Promise<void> {
    this.plays += 1;
    if (this.isBlocked) throw new Error("autoplay blocked");
    await Promise.resolve();
  }

  pause(): void {
    this.pauses += 1;
  }
}

function sound(url: string): FakeAudio {
  const audio = FakeAudio.created.find((candidate) => candidate.src === url);
  if (audio === undefined) throw new Error(`no sound for ${url}`);
  return audio;
}

beforeEach(() => {
  FakeAudio.created.length = 0;
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createAmbience", () => {
  it("preloads the three sounds, only the ambience looping and quieter", () => {
    createAmbience();
    expect(FakeAudio.created.map((audio) => audio.src)).toStrictEqual([
      AMBIENCE_FILES.ambience,
      AMBIENCE_FILES.bell,
      AMBIENCE_FILES.bowl,
    ]);
    expect(FakeAudio.created.every((audio) => audio.preload === "auto")).toBe(true);
    expect(sound(AMBIENCE_FILES.ambience).loop).toBe(true);
    expect(sound(AMBIENCE_FILES.ambience).volume).toBeCloseTo(0.35);
    expect(sound(AMBIENCE_FILES.bell).loop).toBe(false);
    expect(sound(AMBIENCE_FILES.bell).volume).toBe(1);
  });

  it("plays the ambience where it left off, and pauses it", () => {
    const ambience = createAmbience();
    const audio = sound(AMBIENCE_FILES.ambience);
    expect(ambience.ambienceOn).toBe(false);
    ambience.setAmbienceOn(true);
    expect(ambience.ambienceOn).toBe(true);
    expect(audio.plays).toBe(1);
    expect(audio.currentTime).toBe(5);
    ambience.setAmbienceOn(false);
    expect(ambience.ambienceOn).toBe(false);
    expect(audio.pauses).toBe(1);
  });

  it("rings the bell and strikes the bowl from the start", () => {
    const ambience = createAmbience();
    ambience.ringBell();
    ambience.strikeBowl();
    expect(sound(AMBIENCE_FILES.bell)).toMatchObject({ plays: 1, currentTime: 0 });
    expect(sound(AMBIENCE_FILES.bowl)).toMatchObject({ plays: 1, currentTime: 0 });
  });

  it("warns once about a missing file and then stays silent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ambience = createAmbience();
    const bell = sound(AMBIENCE_FILES.bell);
    bell.dispatchEvent(new Event("error"));
    bell.dispatchEvent(new Event("error"));
    ambience.ringBell();
    expect(warn).toHaveBeenCalledOnce();
    expect(bell.plays).toBe(0);
    expect(bell.currentTime).toBe(5);
  });

  it("warns when the browser refuses to play", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ambience = createAmbience();
    sound(AMBIENCE_FILES.bowl).isBlocked = true;
    ambience.strikeBowl();
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith("Sound could not play:", expect.any(Error));
    });
  });
});
