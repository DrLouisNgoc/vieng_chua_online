# Milestone 4 status

Spec: spec.md (same folder). Scope grew a lot during the 2026-11-03/04
sessions at the owner's request in chat; each change is listed here, in
order, rather than rewriting the original spec.

## Scope changes (owner requests, in order)
1. Click-to-move added, then **removed** at the owner's request — movement is
   keyboard only.
2. Keyboard movement: first camera-relative WASD; then RPG "tank" controls
   (A/D turn, W/S walk, camera auto-recentering behind the back); then
   **back to camera-relative WASD with free drag-to-rotate camera that keeps
   its angle** ("như bình thường"). Current: WASD camera-relative, avatar
   turns to face its walk direction, Shift runs (x2.2), drag rotates camera,
   wheel zooms.
3. Skeletal walk animation on monk.glb's own rig (thighs, shins, upper arms),
   procedural, no new asset.
4. Lighting/environment pass: sky gradient, fog, hemisphere + shadow-casting
   sun, ACES tone mapping, tiled ground texture.
5. Temple grounds built (decision 0008): main hall, stone pillars, meditation
   hut, lotus pond, banyan tree, meditation seats, stone path, extra pines,
   with collisions and platform heights.
6. Main hall enlarged three times: 9x6 -> 16x11 -> 24x17 -> **76x54** (owner:
   "gấp 10 lần"). Ceiling 16, Shakyamuni Buddha 12 tall on a gold lotus
   pedestal with a halo and warm spot/fill lighting, bodhisattvas 6 tall,
   384 cushions in rows with a centre aisle (InstancedMesh).
7. Moktak autoplay removed, then the whole moktak HUD panel removed. The
   in-scene moktak sprite still strikes on click.

## Rulings (decided alone — say if wrong)
- Ruling: "gấp 10 lần" read as 10x floor **area** (76x54), not 10x each side
  (240x170) — why: 240 units would take over a minute to cross on foot —
  cost if wrong: re-scale HALL in temple-layout.ts (all hall geometry and
  lights derive from it).
- Ruling: "kích thước ngang sansa" not matchable exactly — why: the original
  hall was never measured during recon — cost if wrong: re-measure the
  original and resize.
- Ruling: avatar picker (name/gender/robe colour) customises only the 2D SVG
  preview; the in-scene avatar stays the original monk.glb — why: decision
  0003, no gendered/coloured 3D variants exist — cost if wrong: needs new or
  recoloured 3D assets (a decision 0003 change).
- Ruling: stuck-key fix keyed on `KeyboardEvent.code` + release all keys on
  window blur/hidden — why: a Vietnamese IME (Unikey/Telex) can report a
  different `key` on keydown vs keyup, leaving a key "held" — cost if wrong:
  owner's "holding a key auto-performs" bug may have another cause.
- Ruling: removed 6 hall glow lights and switched to PCF (not PCF-soft)
  shadows for performance — why: frame rate was 10-13 fps — cost if wrong:
  hall a little dimmer; only a small gain was measured (see below).

## Bugs found and fixed
- Onboarding "Vào chùa" did nothing visible: `.onboarding { display:flex }`
  overrode the `hidden` attribute. Fixed with `.onboarding[hidden]`.
- No limb movement: GLTFLoader strips "." from node names ("thigh.L" loads as
  "thighL").
- Legs flipped up: bone rotation overwrote the rest pose; now an offset from
  the rest quaternion about the avatar's side axis.
- Walking faced backwards: monk.glb's front faces the opposite way; +PI.
- Zoom out then in did not restore distance; now exponential zoom.
- Keys stuck down (see ruling above).

## Verification
- `npm test` in app/: 61 tests pass; `tsc --noEmit` clean (2026-11-04).
- Screenshots via Playwright driving system Chrome with the real GPU
  (`channel: 'chrome'`, `--use-angle=d3d11`) — headless Chromium's software
  WebGL times out once shadows are on. Scripts live only in the session
  scratchpad, not in the repo.

## Open problems
- **Frame rate**: 10-13 fps before, 11-15 fps after the light reduction
  (two runs each, Intel UHD, Playwright-driven Chrome). Main cost not yet
  found — candidates: sun shadow pass over the whole 90-unit area (pine
  foliage), MSAA at full resolution, pixel ratio. Measure before changing.
- **Camera occlusion**: the camera can sit behind a stone pillar or wall
  and lose sight of the avatar. Fix idea: raycast target->camera and pull
  the camera in front of the first hit.
- Not checked: 375px screenshots after the latest changes; real Unikey on
  the owner's machine (only simulated key events).
- Bow/seat/bead interactions (original sansatemple.com features, see
  milestone-1 protocol-notes.md) not started; owner asked for "ngồi viếng",
  "tràng hạt", "quét sân" (the last is not an original feature).

*Status: in progress — work so far committed directly on `main` as
dcef80d (2026-11-04), at the owner's explicit request, instead of the
global branch + PR rule. Not pushed.*
