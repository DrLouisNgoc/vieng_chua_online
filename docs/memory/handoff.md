# Handoff

## Goal
A personal Vietnamese-localized web clone of https://sansatemple.com — a 3D
(Three.js) virtual temple visit — for the owner's private use only, with an
owner-run backend, later deployed privately. Never shared/published/
monetized. PRD: docs/product/vieng-chua-online.prd.md.

## Status (2026-11-07)
Milestones 1-3 done and committed. **Milestone 4 in progress**, all merged
into local `main` (no remote exists): latest work was the grounds smoke
test, frame-rate profile and pine simplification (merge 4340ed7). Read
docs/specs/milestone-4-movement-character-screen/status.md first: it lists
every scope change, ruling, fixed bug and open problem.

What the app does now:
- Onboarding card (name, gender, robe colour, parametric SVG avatar adapted
  from chuasen.com per decision 0007) -> "Vào chùa".
- 3D grounds (all procedural, decision 0008): 76x54 main hall raised on a
  9-step stair with balustrades, two-tier Vietnamese curved roof with "đầu
  đao" corners, ridge and flaming pearl; Shakyamuni 12 tall on a gold lotus
  pedestal with halo + warm lights, two bodhisattvas, 384 cushions with a
  centre aisle. Yard inside an ochre perimeter wall (front 130, sides 53,
  back 15), entirely brick-paved; tam quan gate with "SƠN TỰ" plaque; stone
  path lined with stone pillars and a tree avenue; incense urn; bell tower
  with bronze bell; wooden meditation hut; rectangular lotus pond with koi
  beside the hall; banyan with seats; bamboo along the wall; small pines
  outside the wall. Collisions + ground heights for all of it.
- WASD camera-relative movement, Shift to run, drag to rotate the camera
  (keeps its angle), wheel to zoom (2.5-30), camera kept out of buildings;
  skeletal walk animation on monk.glb's own rig; avatar eases up stairs.
  Clicking the in-scene moktak sprite plays the sound (the moktak HUD panel
  was removed at the owner's request).
- Presence count from the owner's server in the header.

## Run it
`npm run dev` in the project root starts the server (ws://localhost:8787)
and the app (http://localhost:5173) via scripts/dev.mjs. `app/public/sansatemple/` must be populated
(gitignored, decision 0006): `scripts/fetch-sansatemple-assets.sh`.
Tests: `npm test` in app/ (211 pass) and server/ (44 pass); `npx tsc --noEmit -p .` clean in both.

## Code map (app/src)
- `temple-layout.ts` — pure plan: HALL, STAIRS, STATUES, BOUNDARY (yard
  size constants FRONT_YARD/SIDE_YARD/BACK_YARD), GATE, POND, trees, seats,
  colliders, `groundHeightAt`. Change sizes here; geometry/lights derive
  from it.
- `temple-grounds.ts` — meshes + interior lights + koi animation
  (`update`), and `cameraBlockers` (buildings the camera must stay out of);
  uses sansatemple PBR materials and procedural canvas textures (bricks,
  plaque).
- `scene.ts` — renderer, sky/fog/sun, model loading, input, camera, walk
  animation, render loop.
- `third-person-camera.ts`, `movement.ts`, `collision.ts`, `walk-cycle.ts`,
  `key-state.ts`, `onboarding.ts`, `avatar-svg.ts`, `curved-roof.ts`,
  `simplify-geometry.ts` (meshoptimizer, used on pine.glb) — unit-tested.
  Milestone 5: `body-pose.ts` (all bones, avatar-frame rotations),
  `pose-for-activity.ts`, `interaction-state.ts` (snapshot ready for
  Milestone 6), `interaction-targets.ts`, `interaction-prompts.ts`,
  `bead-counter.ts`, `leaf-field.ts` — pure, unit-tested;
  `interaction-runtime.ts` (wiring), `interaction-props.ts` (meshes),
  `interaction-hud.ts` (DOM).
  `temple-grounds.test.ts` builds the whole grounds in Node.
- Third-party assets (decision 0009): files go in `app/public/thirdparty/`
  (gitignored), each listed in `docs/assets/third-party-assets.md` first.
  Owner said they will provide a Mixamo character + animations, audio and
  reference screenshots (`reference/`, gitignored); none provided yet.

## Decisions (docs/memory/decisions/) — read before re-deciding
0001 personal use only · 0002 Electron (superseded) · 0003 keep original
assets, translate text · 0004 own backend · 0005 web app · 0006 assets are a
gitignored cache · 0007 chuasen.com as narrow UX reference · 0008
procedural grounds; **chuasen.com source is referenced** (avatar SVG,
variant CSS mechanism, character-screen layout) **but not copied
wholesale** (owner asked for a full copy repeatedly; declined) · 0009
licensed third-party assets allowed (catalogued, gitignored; none yet) ·
0010 robe tinted at runtime per visitor (amends 0003).

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
- In `buildTempleGrounds`, builders are function declarations called before
  `return`; any `const` they use must sit above that call (or at module
  level), or it hits the temporal dead zone at runtime. No test builds the
  grounds, so this only shows in the browser.
- On Windows the Bash tool's `python` can hang (Store stub); use `node`.
- Headed Chrome under Playwright gets rAF-throttled to ~1 fps when its
  window is not on screen, even with --disable-background* flags. For
  timing, render 60 frames synchronously (`renderer.render` + 1px
  `readPixels`) via a temporary `window.__perf` hook; never commit it.
- Count triangles per mesh before guessing at render costs: one imported
  model (pine.glb) was 95% of the scene.
- The start position is in front of the hall stairs, facing the hall.
- chuasen.com closed on 2026-11-06; only old notes remain as reference.
- `?gio=HH` previews any hour of the day/night cycle.
- Playwright clicks can stall on "stable" checks when Chrome throttles a
  covered window: pass --disable-backgrounding-occluded-windows,
  --disable-renderer-backgrounding, --disable-background-timer-throttling.
- Two-visitor browser checks: two Playwright contexts in one headed
  Chrome; for render timing, keep a second window open in both arms of
  the comparison (it competes for the GPU).
- Other visitors are cloned (SkeletonUtils) from an unposed copy of
  monk.glb taken before the own avatar is first posed.
- Bone rotation axes on monk.glb (avatar frame, Euler YXZ): x>0 swings a
  limb forward / bends the elbow forward, spine x<0 bends forward; for the
  left arm z>0 moves it inward and y (applied last) swings a
  forward-pointing forearm sideways, y<0 = inward. Probe one axis at a
  time with screenshots before tuning a pose.
- For browser checks, a temporary `window.__verify.placeAt(x, z)` hook
  (movement.placeAt) teleports the avatar; never commit it.

## Next (pick up here)
-1. **Moving to another machine (2026-11-09):** the owner zips this folder.
   `_chuyen-may/` (git-excluded, holds sessions, global CLAUDE.md, rules,
   dev-team plugin source) + `CAI-DAT.bat` installs them and runs `npm ci`.
   Not moved: MCP rea/codegraph, browser localStorage counts. Delete
   `_chuyen-may/` once the new machine works; it holds full chat history.
   Still open for the owner: 3 CC0 sound files, proofread Tâm Kinh.
0. **Milestone 5 (interactions) is done** and merged into local main:
   sit (E near a cushion), greet (Q), bow (E seated / in front of the
   altar), beads (B, total in localStorage), broom + leaves. Read
   docs/specs/milestone-5-interactions/status.md (evidence, rulings, open
   problems). Milestone 6 (other visitors visible) is also done; read
   docs/specs/milestone-6-visitors/status.md (criterion 7 render cost is
   inconclusive). Milestone 7 (day/night, lanterns, chanting, moktak autoplay, sound) is
   done too: docs/specs/milestone-7-atmosphere-practice/status.md. The owner
   still has to download 3 CC0 sound files (docs/assets/third-party-assets.md)
   and proofread the Tâm Kinh text (app/src/chant-texts.ts). Next:
   Milestone 8 private deploy (red tier, ask first).
   **Gate mode is now auto** (AGENTS.md).
1. Owner: confirm the two yard rulings in status.md ("x10/x5" on the
   gaps; "nhỏ đi 2 lần" = half the area) — asked 2026-11-05, no answer yet.
2. Frame rate: pines fixed, and the ~970 small meshes are now instanced
   (790 -> 554 scene meshes/draw calls, -30%; branch
   perf/instance-small-props, see status.md) — but the frame-time effect
   on this machine was inconclusive (noise bigger than the diff). Still
   ~22-40 fps, noisy. Next candidates, measure on an idle machine with a
   GPU profiler: light count (6 on PBR materials), MSAA, pixel ratio.
3. Milestone 6 follow-ups: measure remote-visitor render cost on two
   real machines; owner to judge the per-visitor broom (E3) in practice.
4. When the owner drops files in `app/public/thirdparty/` (Mixamo character
   + idle/walk/run/sit/pray/bow) or `reference/`, catalogue and use them.
5. Later: Milestone 8 private deploy (red tier). Recommendation given, not
   confirmed: Tailscale + one small VPS.

## Constraints
- No DRM bypass; only publicly fetchable assets. Never publish/deploy
  publicly/monetize. Deployment, push, merge need the owner's go-ahead.
