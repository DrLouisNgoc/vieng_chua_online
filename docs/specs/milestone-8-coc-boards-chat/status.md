# Milestone 8 status

No separate spec.md: built directly from the owner's chat requests on
2026-11-09 (several rounds, each a small AskUserQuestion — see Rulings).
Private deploy, previously Milestone 8, is renumbered to Milestone 9.

## Scope delivered

1. **Robe**: a 6th swatch, plain white ("áo cư sĩ Nam Tông"), added as
   the default (index 0). The other 5 colours are unchanged.
2. **Buddha statue**: confirmed, not changed — the only Buddha model
   (`buddha.glb`) has been documented as Shakyamuni (Thích Ca) since
   Milestone 4; there is no second model to swap in.
3. **8 cốc**, laid out in a ring around the existing meditation hut
   (`HUT`, untouched) in `temple-layout.ts` (`COC_SPOTS`):
   - 4 named, fixed: Cốc Cô Yến, Cốc Anh Tuấn Hà, Cốc Sư Nguyên Tuệ,
     Cốc Khánh (owner's own name). No registration; the owner performs
     the first edit on each (which sets that cốc's password) and hands
     the password to the person it's for.
   - 4 open ("Cốc Thuyết Pháp 1-4"): start empty. Anyone can submit a
     registration (name + note); the owner approves or rejects from an
     in-app admin screen (its own password, set on first use). Approval
     assigns the occupant; only then can content be written (same
     first-edit-sets-password mechanic).
4. **Hall projector**: a framed photo of Thiền Sư Nguyên Tuệ (placeholder
   until the owner drops a real file — see Assets below) and a screen
   prop inside the hall. Its board (`may-chieu-chanh-dien`) is a fixed,
   video-type board: body is one YouTube URL per line, embedded via
   `youtube-nocookie.com`.
5. **Boards panel** (`boards-panel.ts`): a header toggle lists all 9
   boards with live status (phụ trách / đang chờ duyệt / còn trống);
   clicking one shows content (read, public) plus a password-gated edit
   form, or a registration form for an empty open cốc. A password that
   successfully edits is cached in `localStorage` per board so the same
   browser isn't asked again.
6. **Walking up to a cốc or the projector** (`board-proximity.ts`,
   `BOARD_REACH` = 1.8) shows "Nhấn E để mở cốc / bài giảng" and opens
   that board directly. Independent of the existing sit/bow/beads state
   machine — the zones never overlap it.
7. **Public chat**: a new WS message type (`chat`), broadcast to
   everyone, with a 50-message server-side ring buffer sent to a new
   joiner as `chat-history`. A small panel, bottom-left.
8. **Server**: boards + admin auth + their HTTP API live on the same
   port as the WS presence server (8787), via Node's own `http` module
   (no new dependency). Persisted to `server/data/boards.json`
   (gitignored — real content from real people, not a fixture; back it
   up before wiping the repo). Passwords are salted+hashed
   (`scrypt`), never stored or logged in plain text.

## Rulings (decided alone via AskUserQuestion, all accepted as recommended — say if wrong)
- Content mechanism: password-gated edit per board, password set on the
  first edit (not self-serve registration for the 4 *named* cốc — the
  owner performs that first edit themselves and hands out the password)
  — why: owner said "người chủ cốc được tôi cấp mật khẩu" — cost if
  wrong: re-key the 4 named boards' passwords (just re-run the first
  edit with a new password; nothing else changes).
- The 4 *open* cốc use registration + owner approval instead — why: "để
  cho một số cư sĩ hoặc thiền sư được đăng ký thuyết pháp" — cost if
  wrong: change `registrable` in `BOARD_SEEDS`.
- Admin approval via an in-app password screen (owner sets it on first
  use), not by asking Claude each time — cost if wrong: none, it's
  additive (the owner can still ask Claude to edit `boards.json`
  directly).
- Teacher photo: placeholder now, owner drops the real file later — the
  code already looks for it; **drop it at
  `app/public/thirdparty/nguyen-tue.jpg`** and it replaces the
  placeholder on the next load, no code change needed.
- YouTube links for the projector: built the player with an empty list;
  owner adds links later through the same password-gated edit box (one
  URL per line) — no code change needed either.
- Placement: the 8 cốc share the existing meditation-hut area rather
  than a new part of the grounds (owner's choice) — cost if wrong:
  change `COC_SPOTS` in `temple-layout.ts`.

## Bugs found and fixed during this pass
- `createBoardsRequestListener`'s register endpoint and the three admin
  endpoints originally shared one HTTP status (409) for several
  different outcomes — fixed by having the client read the JSON
  `error` field instead of only the status code (`boards-client.ts`).
- The 8 new cốc were not included in `cameraBlockers`, so the camera
  clipped straight through their walls when the avatar stood next to
  one (`buildCocHuts` returned one wrapper Group; changed to return the
  8 individual hut Groups, folded into the same `buildings` array as
  the hall/gate/wall/bell-tower/original hut).
- The photo stand's front leg post was modelled at the same z as the
  photo plane, so it visually poked through the picture; moved the leg
  0.12 units behind the frame.
- `server.ts`'s new `httpServer` (via the `server` option to
  `WebSocketServer`) had no listener for its own `'error'` event (e.g.
  `EADDRINUSE` on a fast dev-watch restart), which Node re-throws as an
  uncaught exception and crashes the process; `ws` also re-emits that
  error on the `WebSocketServer` itself, which needs its own listener
  too. Added both; a failed bind now logs one line instead of crashing.

## Verification
- `npm test`: app 234 (was 211, +16 for this milestone, +7 more for the
  same-day follow-ups below), server 99 (was 44) — all new code
  TDD'd first where it's pure logic (`boards.ts`, `adminAuth.ts`,
  `passwordHash.ts`, `chatRoom.ts`, `boardsHttp.ts`,
  `board-proximity.ts`, `boards-client.ts`, plus extensions to
  `protocol.ts`/`visitor-protocol.ts`/`presence.ts`/`visitorRoom.ts`).
  `tsc --noEmit` clean in both.
- DOM-wiring modules (`boards-panel.ts`, `chat-panel.ts`) have no unit
  tests, matching `practice-panel.ts`/`interaction-hud.ts` — verified
  instead by driving the real app (Playwright-equivalent browser pane):
  registered for Cốc Thuyết Pháp 1, approved it from the admin screen
  (first-use password), wrote and saved its first dharma line with a
  new password, sent a public chat message and saw it appear, walked to
  "Cốc Anh Tuấn Hà" and opened it with E, confirmed the camera no
  longer clips through the 8 new huts, confirmed the hall photo frame
  + screen render (placeholder photo) without poking-through geometry.
  Screenshots at 375px and 1440px.
- Not checked: the video board with a real YouTube link in it (no link
  added yet); two real browsers chatting with each other at once (only
  driven from one browser this session); the admin screen's behaviour
  with more than one pending registration at a time; load/restart with
  an already-populated `boards.json` (only tested from a fresh file).

## Follow-up changes (same day, owner feedback after the initial build)
- Renamed 3 of the 4 named cốc to the real people they're for: "Cốc Cô
  Yến", "Cốc Anh Tuấn Hà", "Cốc Khánh" (owner's own); "Cốc Sư Nguyên Tuệ"
  unchanged. `BOARD_SEEDS` ids kept stable (`coc-co-chi-yen` etc.), only
  `title` changed, so no existing content/password is lost.
- Re-laid-out `COC_SPOTS` from a grid to a single row, named cốc first
  (`temple-layout.ts`).
- Moved the hall projector + teacher photo to right in front of/under
  the Buddha statue (`HALL_PROJECTOR` in `temple-layout.ts`).
- Added a new chant, "Niệm Bổn Sư Thích Ca" (`chant-texts.ts`,
  `ChantId = "thichca"`), as the first chant in the list.
- Movement speed raised 2.4 -> 4 units/sec (`movement.ts`,
  `DEFAULT_SPEED_UNITS_PER_SECOND`) — the grounds had grown since that
  default was set in Milestone 4.
- Removed the ornate roof corner curls ("đầu đao") on the small cốc —
  looked oversized at their scale; kept on the main hall and the
  original meditation hut (`hutGroup(..., ornate)` flag in
  `temple-grounds.ts`; `buildCocHuts()` passes `ornate=false`).
- Projector now shows something even without opening the panel: the
  scene fetches the projector board once at load and sets a static
  YouTube thumbnail (`img.youtube.com/vi/<id>/hqdefault.jpg`) as the
  in-world screen's texture (`setProjectorPreview`, `temple-grounds.ts`
  + `scene.ts`). A YouTube iframe can't feed a Three.js texture
  (cross-origin), so real playback still needs opening the board panel
  — told the owner this is a hard limit, not a bug.
- Lecture list given a "Tên bài | URL" format (`parseTalks` in
  `boards-client.ts`) so the projector board can hold several named
  talks; `boards-panel.ts` renders a clickable pick-list, falls back to
  the raw URL as the title for the old one-URL-per-line format.
- Fixed a real bug: cốc walls rendered near-solid-black regardless of
  time of day (even at forced noon, `?gio=12`) — the hut's own roof was
  self-shadowing its own walls via the sun's shared 90-unit shadow map,
  too low-resolution at a cốc's scale. Fixed by `roofMesh.castShadow =
  false` in `hutGroup()` (external shadows onto cốc walls, e.g. from
  trees, still land via `receiveShadow`). See handoff.md gotchas.

## Open problems
- No "back to list" button from a board's detail view or the admin
  screen — only "Đóng" (closes the whole panel) then the toggle again.
  Works, but it's an extra click.
- The 4 open cốc's board title stays "Cốc Thuyết Pháp N" after
  approval; only `occupantName` (shown in the panel's status line, not
  in the 3D nameplate) says who it's for. The 3D nameplate itself is
  static text baked in at build time (`COC_SPOTS[].title`), so it won't
  show the occupant's name without a texture-update mechanism — not
  built, kept out of scope for this pass.
- No UI yet for the owner to reset a forgotten board password (the
  owner can ask Claude to edit `server/data/boards.json` directly: set
  that board's `passwordHash` to `null`, next edit sets a new one).
