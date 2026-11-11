// Sky, sun and fog for the local hour of the day (owner decision F1:
// follows the visitor's real clock). Pure: scene.ts applies the result.

export interface SkyState {
  sunDirection: { x: number; y: number; z: number };
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  skyTop: number;
  skyHorizon: number;
  fog: number;
  exposure: number;
  // 0 in daylight, 1 at full night (drives lanterns).
  night: number;
}

type Look = Omit<SkyState, "sunDirection">;

const NIGHT: Look = {
  sunColor: 0x9fb4ff,
  sunIntensity: 0.6,
  hemiSky: 0x3a4a7a,
  hemiGround: 0x2a2018,
  hemiIntensity: 0.6,
  skyTop: 0x0b1430,
  skyHorizon: 0x1c2540,
  fog: 0x1c2540,
  exposure: 1.2,
  night: 1,
};

// The look the temple had before Milestone 7.
const DAY: Look = {
  sunColor: 0xffe8c4,
  sunIntensity: 2.2,
  hemiSky: 0xdfeaf5,
  hemiGround: 0x6b5a3e,
  hemiIntensity: 0.9,
  skyTop: 0x9cbcd6,
  skyHorizon: 0xe8dcc4,
  fog: 0xe8dcc4,
  exposure: 1.05,
  night: 0,
};

const KEYFRAMES: [number, Look][] = [
  [0, NIGHT],
  [5, { ...NIGHT, skyTop: 0x1a2448, skyHorizon: 0x3a3550, fog: 0x3a3550 }],
  [
    6.5,
    {
      sunColor: 0xffb070,
      sunIntensity: 1.2,
      hemiSky: 0xc8c0d8,
      hemiGround: 0x5a4a3a,
      hemiIntensity: 0.6,
      skyTop: 0x6f8fb8,
      skyHorizon: 0xf0b080,
      fog: 0xe0b896,
      exposure: 1.0,
      night: 0.3,
    },
  ],
  [9, DAY],
  [16, DAY],
  [
    18,
    {
      sunColor: 0xffa050,
      sunIntensity: 1.3,
      hemiSky: 0xd8b8a0,
      hemiGround: 0x5a4433,
      hemiIntensity: 0.6,
      skyTop: 0x7a8fb0,
      skyHorizon: 0xf2a35e,
      fog: 0xd9a678,
      exposure: 1.0,
      night: 0.2,
    },
  ],
  [
    19.5,
    {
      sunColor: 0x8090d0,
      sunIntensity: 0.8,
      hemiSky: 0x4a5080,
      hemiGround: 0x2a2018,
      hemiIntensity: 0.4,
      skyTop: 0x2a3560,
      skyHorizon: 0x8a5a60,
      fog: 0x5a4a5a,
      exposure: 1.0,
      night: 0.8,
    },
  ],
  [21, NIGHT],
  [24, NIGHT],
];

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

function lerpColor(a: number, b: number, k: number): number {
  if (a === b) return a;
  const channel = (shift: number): number => Math.round(lerp((a >> shift) & 0xff, (b >> shift) & 0xff, k)) << shift;
  return channel(16) | channel(8) | channel(0);
}

function lerpLook(a: Look, b: Look, k: number): Look {
  return {
    sunColor: lerpColor(a.sunColor, b.sunColor, k),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, k),
    hemiSky: lerpColor(a.hemiSky, b.hemiSky, k),
    hemiGround: lerpColor(a.hemiGround, b.hemiGround, k),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, k),
    skyTop: lerpColor(a.skyTop, b.skyTop, k),
    skyHorizon: lerpColor(a.skyHorizon, b.skyHorizon, k),
    fog: lerpColor(a.fog, b.fog, k),
    exposure: lerp(a.exposure, b.exposure, k),
    night: lerp(a.night, b.night, k),
  };
}

// East (+x) at sunrise, high at noon, west (-x) at sunset; at night a
// moon high in the sky, so shadows always fall on the ground.
const MOON = { x: -0.25, y: 0.85, z: 0.45 };

function sunDirection(hour: number, night: number): SkyState["sunDirection"] {
  const t = Math.min(1, Math.max(0, (hour - 6) / 12));
  const day = { x: Math.cos(t * Math.PI) * 0.75, y: 0.35 + 0.65 * Math.sin(t * Math.PI), z: 0.35 };
  const x = lerp(day.x, MOON.x, night);
  const y = lerp(day.y, MOON.y, night);
  const z = lerp(day.z, MOON.z, night);
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length };
}

export function skyAt(hour: number): SkyState {
  const h = ((hour % 24) + 24) % 24;
  let look = NIGHT;
  for (let i = 0; i < KEYFRAMES.length - 1; i += 1) {
    const [fromHour, from] = KEYFRAMES[i]!;
    const [toHour, to] = KEYFRAMES[i + 1]!;
    if (h >= fromHour && h <= toHour) {
      look = lerpLook(from, to, (h - fromHour) / (toHour - fromHour));
      break;
    }
  }
  return { ...look, sunDirection: sunDirection(h, look.night) };
}

export function localHour(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}
