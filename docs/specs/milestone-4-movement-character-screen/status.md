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
8. Architecture pass (2026-11-04, owner: "tập trung vào kiến trúc cho
   đẹp"): Vietnamese curved roofs with upturned "đầu đao" corners
   (`curved-roof.ts`, pure + tested) on the hall (two tiers + ridge with
   curled ends and flaming pearl), hut and bell tower; tam quan gate with
   "SƠN TỰ" plaque; ochre perimeter wall; bell tower with bronze bell
   (walkable under); terracotta-tiled courtyard (procedural canvas
   texture); bronze incense urn; wooden meditation hut; koi swimming in
   the lotus pond; broadleaf trees and bamboo groves (instanced). Camera
   max zoom 16 -> 30, and the camera is pulled in front of buildings
   (hall, gate, wall, bell tower, hut) that would block the view.
   Decision 0009 now allows licensed third-party assets; none added yet.
9. Yard resized twice and paved (2026-11-04): first front x10 / sides x5,
   then "giảm diện tích ... nhỏ đi 2 lần" -> front yard 130, side yards
   53, back 15 (yard area half of the x10/x5 version; tested). Small pines
   moved outside the wall in rows. Whole yard inside the wall brick-paved.
   Lotus pond is now a stone-curbed rectangle beside the hall's right side
   (koi swim ellipses). Hall raised on a 9-step stair with stepped
   balustrades; ceiling raised by the same amount so the Buddha still
   fits; platform edges blocked so the hall is entered by the stairs.
   Shift runs; the avatar eases up/down steps.

## Rulings (decided alone — say if wrong)
- Ruling: "chiều dài x10, chiều rộng x5" applied to the yard gaps between
  hall and wall (front 21 -> 210, sides 17 -> 85), back gap unchanged —
  why: owner named the space between wall and hall — cost if wrong: change
  FRONT_YARD/SIDE_YARD/BACK_YARD in temple-layout.ts.
- Ruling: "diện tích nhỏ đi 2 lần" read as half the yard **area** (both
  gaps x0.62: front 130, sides 53), not each gap halved (105 / 42.5) —
  why: the owner said "diện tích" (area) — cost if wrong: the same three
  constants.
- Ruling: a 9-step stair = platform height 9 x 0.3, interior height kept
  by raising the ceiling equally — why: otherwise the 12-tall Buddha would
  pierce the ceiling — cost if wrong: STEP_RISE / INTERIOR_HEIGHT.
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
- Ruling: pines simplified at load to 10% of their triangles (PINE_DETAIL
  in scene.ts), not 5% — why: 5% left visible gaps and floating twigs at
  6 units; 10% looks the same from the yard — cost if wrong: change
  PINE_DETAIL (1 = original).

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
  **Profile 2026-11-05**: the scene holds 11.3M triangles, 10.7M of them
  in the 27 pines (pine.glb, ~395k tris each, 3 meshes, all cast shadows);
  ~2.4M tris and ~417 draw calls drawn per frame (colour + shadow pass).
  DPR is 1. Comparative fps runs were unreliable: Chrome throttled the
  window to ~1 fps whenever it was not on screen, even with the
  background-throttling flags. Single valid runs: base 26-28, pine
  shadows off 27-34, all shadows off 38-40, no MSAA 31-36.
  **Fix 2026-11-05**: pines simplified to 10% (simplify-geometry.ts):
  scene 11.3M -> 1.6M tris, drawn per frame 2.46M -> 1.02M, ~415 calls
  unchanged. Timed with 60 synchronous renders + readPixels (immune to
  rAF throttling), two alternating runs each, machine not idle: after
  28-45 ms/frame, before 34-48 ms. After the fix, shadows-off and frozen
  shadow map measured within the noise (25-42 ms), so shadows are no
  longer the clear cost. Remaining cost not isolated; next candidates:
  ~160 colour-pass draw calls (971 meshes, many small spheres/cylinders
  that could be merged or instanced), 6 lights on PBR materials, MSAA.
- Camera occlusion: fixed for buildings (raycast to `cameraBlockers`).
  Small props (urn, pillars, trees) may still hide the avatar, by choice.
- After the architecture pass the yard measured 31 fps once and 12 fps
  once (different views, same machine); after the paving/stairs pass
  22-26 fps (one run, two views). Frame rate still unresolved and noisy;
  needs a proper profile.
- (Fixed 2026-11-05: smoke test temple-grounds.test.ts.) A bug from this pass was caught only in the browser, not by tests: pond
  constants declared after the builder's `return` hit the temporal dead
  zone and the grounds failed to build. Lesson: grounds builders have no
  smoke test; a Node test that calls buildTempleGrounds with a stub
  loader would have caught it.
- Not checked: the hall's new two-tier roof seen from outside at a wide
  angle (camera stays under the eave from the courtyard); 375px.
- Not checked: 375px screenshots after the latest changes; real Unikey on
  the owner's machine (only simulated key events).
- Bow/seat/bead interactions (original sansatemple.com features, see
  milestone-1 protocol-notes.md) not started; owner asked for "ngồi viếng",
  "tràng hạt", "quét sân" (the last is not an original feature).

*Status: in progress — work so far committed directly on `main` as
dcef80d (2026-11-04), at the owner's explicit request, instead of the
global branch + PR rule. Not pushed.*
