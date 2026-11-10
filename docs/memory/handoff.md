# Handoff

## Goal
A personal Vietnamese-localized web clone of https://sansatemple.com — a 3D
(Three.js) virtual temple visit — for the owner's private use only, with an
owner-run backend, later deployed privately. Never shared/published/
monetized. PRD: docs/product/vieng-chua-online.prd.md.

## Status (2026-11-10)
Milestones 1-9 done. Milestone 10 (not in the original plan; owner
requested it live, same session): bell toll on entry, background music,
private "hỏi pháp" questions, per-cốc "bài giảng", cốc renaming, chánh
điện quote plaque, public answers to "hỏi pháp" — all built, committed
and pushed earlier this session (commits up to `ab2b2fb`), including a
live-site fix (`runtime-urls.ts`) for a `VITE_*_URL` deploy gap.

**Two more follow-ups, committed and pushed this same session**
(commit `3570707`, owner said "Push luôn"): (1) each visitor's pháp
danh is now locked to their ip (server remembers it, persisted to
`data/visitor-names.json`; onboarding starts empty and refuses the old
generic default "Thiện Tâm" outright — owner: "mỗi người sẽ phải để 1
pháp danh... trùng với ip của họ... chỉ được dùng 1 pháp danh này");
(2) the temple bell now also tolls on its own once an hour, independent
of anyone joining (owner: "âm thanh chuông tự động đánh... cứ 1 tiếng
đánh 1 lần"). Scope, rulings, what changed:
docs/specs/milestone-10-chuong-nhac-hoi-phap-cau-noi/status.md ("Follow-up:
pháp danh locked per ip" / "Follow-up: the bell also tolls on its own").
App 254 + server 139 tests pass, typecheck clean both; verified live in
the running dev app, then confirmed live on chua.io.vn after the push.

Right after that push, the owner tried the live site and reported the
"Bài giảng Thầy Nguyên Tuệ" board panel looking broken (screenshot: no
visible close button, a stray scrollbar). Not a regression from the
push — the board panel has always scrolled when its content is taller
than the space available, and the close button scrolled away with
everything else. Fixed: `.boards__close` is now `position: sticky` with
a solid background, so it stays visible/clickable regardless of scroll
position. Committed (`38b69cd`).

**New board, same session: "Đọc Kinh Nikaya"** (owner: "tạo thêm 1 chỗ
để đọc kinh nikaya... mỗi ngày tự động hiện lên 1 bài kinh hay", source:
budsas.org's Trung Bộ Kinh). Stores a title + a link to read on the
source site (reuses the existing `Talk`/"Tên | link" format, same as
bài giảng) — deliberately **not** the sutta's own translated text,
since that translation is copyrighted (distinct from the ancient Pali
canon itself); `sutraOfTheDay()` picks the same one for every visitor
each local calendar day. Board starts empty — budsas.org didn't have a
cleanly scrapable per-sutta index, so no starter entries were
auto-filled; the owner fills it in via the board's own edit form, same
as any other cốc. See
docs/specs/milestone-10-chuong-nhac-hoi-phap-cau-noi/status.md
("Follow-up: Đọc Kinh Nikaya") for the full ruling. App 258 tests pass,
tsc clean; not yet committed as of this status line.

Milestone 9 (deploy) is live and public:
`https://chua.io.vn` (VPS, user `chua`, Caddy reverse-proxying the
node server + serving `app/dist`, systemd service `chua-server`, SSH
deploy key for `git pull`). This is a *public* deploy (no VPN/login) —
see decision 0011, which supersedes decision 0001's "no public deploy"
(owner explicitly accepted the copyright-exposure risk from the
still-unreplaced sansatemple.com assets rather than add an access gate).
Deploy guide for the owner: `docs/for-owner/huong_dan/` (00-12, step by
step). GitHub remote exists now: `github.com/DrLouisNgoc/vieng_chua_online`
(private), redeploy via `/opt/chua/deploy.sh` (file 11).
Milestone 4's own open problems (frame rate, yard ruling confirmation) are
unrelated and still open — read
docs/specs/milestone-4-movement-character-screen/status.md.

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
- Day/night cycle, lanterns, chanting (3 texts), moktak autoplay (Milestone
  7). 8 cốc around the meditation hut (4 named + 4 open for registration,
  owner-approved) and a photo+projector for Thầy Nguyên Tuệ in the hall;
  the 8 cốc are password-gated content boards (Milestone 8), the hall
  projector board is **not** (owner request, 2026-11-10: "cho dán link ở
  máy chiếu không cần mật khẩu" — `requiresPassword: false` in
  `BOARD_SEEDS`, see boards.ts) and ships with a hardcoded default talk
  link that only applies if the board has never been persisted yet
  (`BoardSeed.body`, mergeWithSeed keeps whatever's already in
  boards.json once it exists). Public chat (Milestone 8). See "Next"
  below for what the owner still has to do.
- (Milestone 10) A bell toll broadcasts to every connected visitor
  whenever anyone joins (server "bell" message, ambience.ringBell() —
  silent until the owner drops `bell-gong.mp3`, see "Next"). A hidden,
  looping YouTube embed plays background music once the visitor clicks
  the header's "🔈/🔊 Nhạc nền" toggle (muted by default — browsers won't
  autoplay sound without a click; `BACKGROUND_MUSIC_VIDEO_ID` in
  background-music.ts, the owner's own song choice). Each cốc has a
  private "Hỏi pháp" form (visitors ask, only the cốc's own password
  reads the answers) and, for the 4 named cốc only, their own "bài
  giảng" talk list alongside their text content (same password, second
  textarea). A cốc's title is now editable from its own edit form (first
  password sets it, same as the body). New "Lời Pháp Chánh Điện" board
  (type "image") holds a list of the owner's own quote photos
  (filename | caption) that cycle on a plaque in chánh điện — a plain
  placeholder shows until photos are listed.
- (Milestone 10, later same day) Each unanswered "hỏi pháp" question has
  an inline "Trả lời" box in the occupant's own password-gated view; once
  answered, the question+answer pair becomes public on that cốc (a new
  "Hỏi đáp" section everyone sees, since the asker has no private page to
  come back to) — owner, 2026-11-10: "cấp riêng tài khoản cho cô Yến/
  anh Tuấn Hà/sư Nguyên Tuệ khi vào cốc để trả lời", clarified public.
- (Milestone 10, follow-up) Onboarding's pháp danh field starts empty
  and is rejected if it's the old generic default "Thiện Tâm" (any
  case/diacritics); the server locks the first real name a visitor
  submits to their ip and recalls it on every later connection (field
  prefilled + `readOnly`), so one visitor can't keep changing their name
  — server/src/visitorNames.ts, persisted alongside boards.json. The
  bell (already tolling on every join) now also tolls on its own once an
  hour, broadcast from the server, no client change needed.

## Run it
`npm run dev` in the project root starts the server (ws + boards HTTP on
:8787) and the app (http://localhost:5173) via scripts/dev.mjs.
`app/public/sansatemple/` must be populated (gitignored, decision 0006):
`scripts/fetch-sansatemple-assets.sh`. Board/chat content persists to
`server/data/boards.json` (gitignored — real content, back it up yourself).
Tests: `npm test` in app/ (254 pass) and server/ (139 pass); `npx tsc --noEmit -p .` clean in both.
The admin password (boards approval panel) and each board's own password
are both "first login/edit sets it" (adminAuth.ts, boards.ts) — no
recovery, only reset: clear `adminPasswordHash` (or a board's
`passwordHash`) in `server/data/boards.json` and restart the server, next
submit sets a new one. Whoever submits first after a reset wins the
password — go set it again right away after resetting on a live deploy.

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
  Milestone 10: `background-music.ts` (pure embed-URL builder + DOM
  wiring, no unit test on the wiring half — same convention as
  boards-panel.ts). `onboarding.ts` gained `isDefaultName()` (mirrors
  server/src/visitorNames.ts) and `lockName()`/`isNameLocked` for the
  pháp-danh-lock follow-up; `main.ts`'s onboarding submit now only
  calls `presence.join()` — entering the temple (hiding the onboarding
  card) moved to `onWelcome`, since a join can now be refused.
  `temple-grounds.test.ts` builds the whole grounds in Node.
  Milestone 8: `board-proximity.ts` (pure, which cốc/projector is in
  reach), `boards-client.ts` (fetch wrapper for the server's boards API),
  `boards-panel.ts` + `chat-panel.ts` (DOM, no unit tests, same as
  practice-panel.ts).
- Third-party assets (decision 0009): files go in `app/public/thirdparty/`
  (gitignored), each listed in `docs/assets/third-party-assets.md` first.
  Owner said they will provide a Mixamo character + animations, audio and
  reference screenshots (`reference/`, gitignored); none provided yet.
  Also expected: `nguyen-tue.jpg` (Thầy Nguyên Tuệ's photo for the hall
  frame; a placeholder shows until it's there, no code change needed).

## Code map (server/src)
- `boards.ts` — pure board store: list/get/edit/register/approve/reject,
  `BOARD_SEEDS` (the 10 board ids/titles, Milestone 10 added
  "loi-phap-chanh-dien"). `passwordHash.ts` (scrypt, shared with
  `adminAuth.ts`). `boardsFile.ts` (JSON persistence, read-or-null /
  write). `boardsHttp.ts` (the HTTP routes, no framework).
  Milestone 10: `edit()` grew optional `talks`/`title` params (same
  password as body); `ask()`/`readQuestions()` added (private per-board
  questions, capped at 100, dropped oldest-first); `BoardType` grew
  `"image"`. `mergeWithSeed`'s `isStoredBoard` treats `talks`/`questions`
  as optional so an older `boards.json` (pre-Milestone-10, e.g. the live
  deploy's) still merges cleanly — don't make them required there.
- `chatRoom.ts` — pure 50-message ring buffer. `visitorRoom.ts` gained
  `nameOf(id)` so a chat message can be attributed to the sender's name.
- `server.ts` runs an `http.Server` (boards + admin routes) with the
  WebSocketServer attached via the `server` option, both on port 8787
  (Milestone 10: `scripts/dev.mjs` now pins `PORT=8787` for this child
  process only — see its own comment for why).
  Milestone 10: broadcasts `{type:"bell"}` to every connected client
  whenever any client's "join" message is accepted, and again on its own
  every `bellIntervalMs` (default 1 hour, a 4th `startPresenceServer`
  param so tests can use a short one). `clientIp()` reads
  `X-Forwarded-For` first (Caddy sets it automatically when
  reverse-proxying), falling back to the raw socket address only when
  that header is absent (local dev) — the raw address alone would be
  Caddy's own address for every real visitor in production.
- `visitorNames.ts` (new, Milestone 10 follow-up) — `isDefaultName()`
  and the ip -> pháp danh store (`createVisitorNameStore`), persisted to
  `data/visitor-names.json` by `server.ts` the same way boards.json is.
  A locked ip's `join` always uses the locked name, even if a (bypassed)
  client sends a different one; an unlocked ip's `join` with the
  forbidden default name is refused instead of registered.

## Decisions (docs/memory/decisions/) — read before re-deciding
0001 personal use only · 0002 Electron (superseded) · 0003 keep original
assets, translate text · 0004 own backend · 0005 web app · 0006 assets are a
gitignored cache · 0007 chuasen.com as narrow UX reference · 0008
procedural grounds; **chuasen.com source is referenced** (avatar SVG,
variant CSS mechanism, character-screen layout) **but not copied
wholesale** (owner asked for a full copy repeatedly; declined) · 0009
licensed third-party assets allowed (catalogued, gitignored; none yet) ·
0010 robe tinted at runtime per visitor (amends 0003) · **0011 public
deploy, no access gate, accepted copyright-exposure risk — amends/
supersedes 0001's "no public deploy"**.

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
- `new WebSocketServer({ server: httpServer })`: ws does not close
  `httpServer` when you call `wss.close()` (you must do it yourself), and
  neither `httpServer`'s own `'error'` event nor the one `ws` re-emits on
  `wss` has a default listener — either one throws uncaught (e.g.
  `EADDRINUSE` on a fast dev-watch restart) unless you add `.on("error", ...)`
  to *both* objects.
- The sun's shadow map (`SHADOW_HALF_EXTENT=45` in scene.ts, a 90-unit
  span on one 2048x2048 map) has too little per-texel resolution for a
  small object's own self-shadowing: a cốc's roof casting a shadow on
  its own walls just below it read as flat black regardless of time of
  day. Fix: `castShadow = false` on that small object's own
  shadow-casting part, keep `receiveShadow` for shadows from bigger
  external casters (trees etc.). Owner, 2026-11-09: "tối quá... sáng
  như ban ngày".
- `main.ts` reads two *separate* build-time env vars: `VITE_PRESENCE_URL`
  (WebSocket) and `VITE_BOARDS_URL` (boards/admin HTTP API), both
  defaulting to `localhost:8787` in prod if unset. Building with only
  `VITE_PRESENCE_URL` set (as the deploy guide first did) leaves every
  board/cốc panel calling `localhost:8787` in the visitor's own browser —
  looks exactly like a 404 ("Không tìm thấy." on every board, including
  one with a hardcoded default body — the fetch itself fails before the
  body is ever read). Also needs its own Caddy `handle` blocks
  (`/boards*`, `/admin*`, same as `/ws*`) or Caddy serves them as static
  files (also 404). Fixed in files 07/09 2026-11-10; owner's VPS still
  needs the Caddyfile + build command re-run to pick it up.
- This app's `preview_start`/`npm run dev` tooling can inject an ambient
  `PORT` env var meant for a single dev server; `scripts/dev.mjs` spawns
  *two* (server on 8787, Vite on 5173), so an inherited `PORT` can push
  the presence/boards server onto the wrong port (silently breaking every
  `ws://localhost:8787` / `http://localhost:8787` default in the app).
  Fixed by pinning `PORT=8787` only for the server child in
  `scripts/dev.mjs`, regardless of what launched the parent.
- A TypeScript discriminated union needs every member's discriminant to
  be a single literal type (not itself a union, e.g.
  `{outcome:"a"|"b"}`) for narrowing-by-elimination (`if (x.outcome ===
  "a") return; use(x.other)`) to type-check — split into one member per
  literal instead (`ReadQuestionsResult` in boards.ts).
- Browsers block automatic audio with sound; only a muted autoplay is
  allowed without a prior click. The background-music toggle starts
  muted and reloads the iframe's `src` with `mute=0` on a real click —
  that direct user gesture is usually enough to let the sound through.
- Behind Caddy's `reverse_proxy`, `request.socket.remoteAddress` as seen
  by the Node server is Caddy's own address, not the real visitor's —
  Caddy sets `X-Forwarded-For` automatically, so anything that needs the
  real visitor ip (e.g. the pháp-danh lock) must read that header first
  and only fall back to the raw socket address for local dev (no proxy
  in front). Easy to miss since local dev works fine either way.
- TypeScript does not carry a null-guard's narrowing into a nested
  `function` *declaration* defined later in the same scope (unlike an
  inline arrow callback at the point of use) — re-bind the narrowed
  value to a new, explicitly-typed `const` first (same pattern already
  used for `musicToggleButton` in main.ts) rather than reading the
  original possibly-null variable inside the nested function.
- Server-side tests that open real WebSocket connections from the test
  process all share one loopback address — any ip-keyed server feature
  (like the pháp-danh lock) needs a way to simulate distinct ips in
  tests; `server.test.ts`'s `connect()` now sends a per-call synthetic
  `X-Forwarded-For` by default (explicit `ip` to simulate the *same*
  visitor reconnecting), and ip-keyed state is persisted to a fresh
  temp-dir file per test (`freshVisitorNamesPath()`), never the real
  `data/visitor-names.json`.

## Next (pick up here)
0. **Deploy (Milestone 9) is live** at `chua.io.vn`, see decision 0011 and
   `docs/for-owner/huong_dan/`. Still open:
   - `app/public/thirdparty/` and `app/public/sansatemple/` are gitignored
     — `git pull` on the VPS does NOT bring them; re-run
     `scripts/fetch-sansatemple-assets.sh` there and `scp` thirdparty/
     files across after every fresh clone (file 07 covers this). Confirm
     `nguyen-tue.jpg` actually made it onto the live VPS — last discussed
     but not confirmed done. A leftover local folder literally named
     `chua@103.126.162.55/` (empty subdirs + one duplicate `nguyen-tue.jpg`)
     turned up on this machine 2026-11-10 — debris from a mistyped
     scp/rsync, not real content; safe to delete, ask the owner first.
   - No access gate in front of `chua.io.vn` (decision 0011, accepted
     risk) — if the owner changes their mind, add Caddy Basic Auth or
     Tailscale; don't do it unasked, it's a reachability change people
     rely on.
   - Admin password and the 4 named cốc passwords: "first submit sets
     it" — owner should set these themselves on the live site now that
     it's public, before someone else does (see "Run it" above).
0b. **Milestone 10's pháp-danh-lock and hourly-bell follow-ups are built
   on this machine, tests green, verified live in dev — not committed
   yet.** See docs/specs/milestone-10-chuong-nhac-hoi-phap-cau-noi/status.md
   ("Follow-up: pháp danh locked per ip" / "Follow-up: the bell also
   tolls on its own, every hour"). Before committing: owner's go-ahead
   (asked this session). Still open either way:
   - Owner to drop `bell-gong.mp3` into
     `app/public/thirdparty/audio/` (docs/assets/third-party-assets.md)
     for either bell (on-join or the new hourly one) to actually have
     sound — silent (console-warn only) until then, same as the other
     optional sounds.
   - Owner to drop quote photos into `app/public/thirdparty/phap-cu/`
     and list them (filename | chú thích, one per line) on the "Lời Pháp
     Chánh Điện" board — a plain placeholder plaque shows until then.
   - Pushing to `main` auto-deploys to the live `chua.io.vn` (CI/CD) —
     needs the owner's explicit go-ahead, separate from committing
     locally (AGENTS.md red tier).
1. Milestone 8 follow-ups, still open: download 3 CC0 sound files
   (docs/assets/third-party-assets.md) and proofread the Tâm Kinh text
   (app/src/chant-texts.ts) — carried over from Milestone 7.
2. Owner: confirm the two yard rulings in Milestone 4's status.md
   ("x10/x5" on the gaps; "nhỏ đi 2 lần" = half the area) — asked
   2026-11-05, no answer yet.
3. Frame rate: pines fixed, and the ~970 small meshes are now instanced
   (790 -> 554 scene meshes/draw calls, -30%; branch
   perf/instance-small-props, see Milestone 4's status.md) — but the
   frame-time effect on this machine was inconclusive (noise bigger than
   the diff). Still ~22-40 fps, noisy. Next candidates, measure on an
   idle machine with a GPU profiler: light count (6 on PBR materials),
   MSAA, pixel ratio.
4. Milestone 6 follow-ups: measure remote-visitor render cost on two
   real machines; owner to judge the per-visitor broom (E3) in practice.
5. When the owner drops files in `app/public/thirdparty/` (Mixamo character
   + idle/walk/run/sit/pray/bow) or `reference/`, catalogue and use them.

## Constraints
- No DRM bypass; only publicly fetchable assets. Never monetize. Push,
  merge, and further reachability changes (e.g. adding/removing an access
  gate on the live deploy) need the owner's go-ahead. Public deploy itself
  is no longer a blocked action — see decision 0011 (amends 0001).
