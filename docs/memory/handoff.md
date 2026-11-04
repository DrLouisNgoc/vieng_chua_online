# Handoff

## Goal
A personal Vietnamese-localized web clone of https://sansatemple.com — a 3D
(Three.js) virtual temple visit — for the owner's private use only, with an
owner-run backend, later deployed privately. Never shared/published/
monetized. PRD: docs/product/vieng-chua-online.prd.md.

## Status (2026-11-04)
Milestones 1-3 done and committed. **Milestone 4 in progress**, committed
directly on `main` as dcef80d at the owner's explicit request (not pushed;
the global rule is branch + PR — ask which the owner wants next time). Read
docs/specs/milestone-4-movement-character-screen/status.md first: it lists
every scope change, ruling, fixed bug and open problem.

What the app does now:
- Onboarding card (name, gender, robe colour, parametric SVG avatar adapted
  from chuasen.com per decision 0007) -> "Vào chùa".
- 3D grounds: 76x54 main hall (ceiling 16, Shakyamuni 12 tall on gold lotus
  pedestal with halo + warm lights, two bodhisattvas, 384 cushions with a
  centre aisle), stone pillars, stone path, meditation hut, lotus pond,
  banyan tree with seats, pines. Collisions + platform heights.
- WASD camera-relative movement, Shift to run, drag to rotate the camera
  (keeps its angle), wheel to zoom; skeletal walk animation on monk.glb's
  own rig. Clicking the in-scene moktak sprite plays the sound.
- Presence count from the owner's server in the header.

## Run it
`npm run dev` in `server/` (ws://localhost:8787), then `npm run dev` in
`app/` (http://localhost:5173). `app/public/sansatemple/` must be populated
(gitignored, decision 0006): `scripts/fetch-sansatemple-assets.sh`.
Tests: `npm test` in app/ (61 pass), `npx tsc --noEmit -p .` clean.

## Code map (app/src)
- `temple-layout.ts` — pure plan: HALL, STATUES, seats, colliders,
  `groundHeightAt`. Change sizes here; geometry/lights derive from it.
- `temple-grounds.ts` — meshes + interior lights, using sansatemple PBR
  materials.
- `scene.ts` — renderer, sky/fog/sun, model loading, input, camera, walk
  animation, render loop.
- `third-person-camera.ts`, `movement.ts`, `collision.ts`, `walk-cycle.ts`,
  `key-state.ts`, `onboarding.ts`, `avatar-svg.ts` — pure, unit-tested.

## Decisions (docs/memory/decisions/) — read before re-deciding
0001 personal use only · 0002 Electron (superseded) · 0003 keep original
assets, translate text · 0004 own backend · 0005 web app · 0006 assets are a
gitignored cache · 0007 chuasen.com as narrow UX reference · 0008
procedural grounds; **chuasen.com source is referenced** (avatar SVG,
variant CSS mechanism, character-screen layout) **but not copied
wholesale** (owner asked for a full copy repeatedly; declined).

## Gotchas learned
- GLTFLoader strips "." from node names: bone "thigh.L" is "thighL".
- Animate bones as an offset from the rest quaternion, never overwrite it.
- monk.glb's front faces opposite the +Z heading convention (+PI).
- Use `KeyboardEvent.code`, not `key` (Vietnamese IMEs rewrite `key`).
- CSS `display` on an element overrides the `hidden` attribute.
- Headless Chromium (software WebGL) times out with shadows on; for
  screenshots drive system Chrome with the GPU via Playwright
  (`channel: 'chrome'`, `--use-angle=d3d11`). Playwright lives only in the
  session scratchpad, not in the repo.
- Claude-in-Chrome extension has not connected in these sessions.

## Next (pick up here)
1. Frame rate 11-15 fps on Intel UHD — measure what costs most before
   changing anything (shadow pass, MSAA, pixel ratio).
2. Camera occlusion behind pillars/walls.
3. Owner-requested interactions: sit/meditate on a cushion, bow, prayer
   beads (original sansatemple features, need server messages), sweeping
   the yard (new, not original).
4. Later: Milestone 5 private deploy (red tier). Recommendation given, not
   confirmed: Tailscale + one small VPS.

## Constraints
- No DRM bypass; only publicly fetchable assets. Never publish/deploy
  publicly/monetize. Deployment, push, merge need the owner's go-ahead.
