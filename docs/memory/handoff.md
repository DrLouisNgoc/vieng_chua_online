# Handoff

## Goal
Build a personal Vietnamese-localized web app clone of https://sansatemple.com
("산사, 잠깐 쉬어가요") — a live multiplayer 3D (Three.js/WebGL) virtual
temple-visit experience — for the owner's own private use only, with a
backend server the owner runs themselves, deployed privately so the owner can
reach it remotely. Never shared/published/monetized. Full PRD:
docs/product/vieng-chua-online.prd.md.

## Status: PRD written, following the gated dev-team process. Not yet building.
Baseline git commit + `baseline` tag exist. `docs/memory/` and
`docs/product/vieng-chua-online.prd.md` exist. No app code yet.

## Decisions made (see docs/memory/decisions/) — read these before re-deciding anything
1. **0001** — Personal use only, never shared/published/monetized.
2. **0002** — ~~Electron~~ **superseded by 0005**.
3. **0003** — Keep original images/3D models/audio as-is; only translate text
   to Vietnamese.
4. **0004** — Build an owner-run backend server (not sansatemple.com's real
   one) for multiplayer/presence features.
5. **0005** — Web app (browser client + own backend), not Electron.
   Supersedes 0002. Deploy target: private cloud, reachable only by the
   owner (deployment itself is a red-tier action — ask before doing it).

## What's been checked (technical recon, this session)
- Live-inspected sansatemple.com with REA (launched a throwaway Chrome with
  `--remote-debugging-port=9333`, `inspect_web_page` + `capture_web_screenshot`
  over CDP). Confirmed: real Three.js/WebGL app, skinned 3D character
  animation, custom shaders, a ~1MB minified bundle `assets/game-*.js`, plus
  `assets/index-*.js` and `assets/safari-scene-bleed-*.js`.
- Screenshot shows: room "산사 10", live player count "03/100", a
  reconnect-on-drop message + "서버 선택" (server select) control — i.e. a
  real multiplayer backend, not just room-themed naming.
- UI interactions visible: 염불 듣기 (listen to chanting), 절하기 (bow),
  목탁 (wooden gong), 염주 (prayer beads), plus "여기서 계속 쉬기" (keep
  resting here).
- Known asset URLs so far: `/assets/altar-wall-calm-*.jpg`,
  `/fonts/SansaQuietUI-Core.woff2`, `/assets/game-*.css`,
  `/assets/buymeacoffee-logo-*.svg`. Full asset inventory not yet done — only
  what loaded during the initial ~5s observation window before the scene
  finished loading.
- `robots.txt`: `Allow: /`, no crawl restriction (says nothing about reuse
  rights — see decision 0001).
- A throwaway Chrome instance may still be running locally (debug port 9333,
  profile under the session scratchpad) — harmless, can be closed or reused
  next session; did not force-kill it to avoid risking the user's real
  browser windows via an unscoped `taskkill`.

## What's NOT done yet (pick up here — Milestone 1 of the PRD)
- No real asset/protocol extraction yet: need to pull the full list of 3D
  model/texture/audio URLs (likely most load only after the loading screen
  finishes or on interaction, not in the first 5s), and use
  `recover_javascript_sources` (REA, needs Wakaru) on `game-*.js` to get
  readable modules — then locate Korean UI text strings and the
  client-server message shapes for presence/the one MVP interaction.
- Milestone 2 (Vietnamese client), 3 (owner backend), 4 (private deploy) not
  started.
- Open questions from the PRD (see docs/product/vieng-chua-online.prd.md
  Open Questions) still unresolved: which interaction to build first, access
  control for the private deployment, where extracted assets live during dev
  (committed to repo or not), hosting provider.

## Constraints to respect going forward
- Never bypass any DRM/anti-copy protection on sansatemple.com; only use
  assets a normal browser session can fetch publicly.
- Never share, publish, deploy publicly, or monetize this app or its assets.
- Cloud deployment (decision 0005/0004) needs the owner's explicit go-ahead
  at that time — don't just deploy it.
- Read docs/memory/open-questions.md, docs/product/vieng-chua-online.prd.md,
  and the decisions/ folder before continuing; don't re-ask what's already
  decided there.
