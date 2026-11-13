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
  sunColor: 0x9f_b4_ff,
  sunIntensity: 0.6,
  hemiSky: 0x3a_4a_7a,
  hemiGround: 0x2a_20_18,
  hemiIntensity: 0.6,
  skyTop: 0x0b_14_30,
  skyHorizon: 0x1c_25_40,
  fog: 0x1c_25_40,
  exposure: 1.2,
  night: 1,
};

// A clear sunny day (owner, 2026-11-13: "trời quang, đẹp, nắng chiếu"): deep blue overhead, a
// pale blue horizon and haze, strong warm sunlight.
const DAY: Look = {
  sunColor: 0xff_f2_d6,
  sunIntensity: 3,
  hemiSky: 0xcf_e4_ff,
  hemiGround: 0x6b_5a_3e,
  hemiIntensity: 1,
  skyTop: 0x2f_7f_d8,
  skyHorizon: 0xbf_e0_ff,
  fog: 0xc8_e2_fa,
  exposure: 1.1,
  night: 0,
};

const KEYFRAMES: [number, Look][] = [
  [0, NIGHT],
  [5, { ...NIGHT, skyTop: 0x1a_24_48, skyHorizon: 0x3a_35_50, fog: 0x3a_35_50 }],
  [
    6.5,
    {
      sunColor: 0xff_b0_70,
      sunIntensity: 1.2,
      hemiSky: 0xc8_c0_d8,
      hemiGround: 0x5a_4a_3a,
      hemiIntensity: 0.6,
      skyTop: 0x6f_8f_b8,
      skyHorizon: 0xf0_b0_80,
      fog: 0xe0_b8_96,
      exposure: 1,
      night: 0.3,
    },
  ],
  [9, DAY],
  [16, DAY],
  [
    18,
    {
      sunColor: 0xff_a0_50,
      sunIntensity: 1.3,
      hemiSky: 0xd8_b8_a0,
      hemiGround: 0x5a_44_33,
      hemiIntensity: 0.6,
      skyTop: 0x7a_8f_b0,
      skyHorizon: 0xf2_a3_5e,
      fog: 0xd9_a6_78,
      exposure: 1,
      night: 0.2,
    },
  ],
  [
    19.5,
    {
      sunColor: 0x80_90_d0,
      sunIntensity: 0.8,
      hemiSky: 0x4a_50_80,
      hemiGround: 0x2a_20_18,
      hemiIntensity: 0.4,
      skyTop: 0x2a_35_60,
      skyHorizon: 0x8a_5a_60,
      fog: 0x5a_4a_5a,
      exposure: 1,
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
  // One 8-bit channel of a 0xRRGGBB colour; byte 2 is red.
  const channel = (byte: number): number => {
    const scale = 256 ** byte;
    return Math.round(lerp(Math.floor(a / scale) % 256, Math.floor(b / scale) % 256, k)) * scale;
  };
  return channel(2) + channel(1) + channel(0);
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
    const [fromHour, from] = KEYFRAMES[i];
    const [toHour, to] = KEYFRAMES[i + 1];
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
