# Handoff

## Goal
Build a personal Vietnamese-localized web app clone of https://sansatemple.com
("산사, 잠깐 쉬어가요") — a live multiplayer 3D (Three.js/WebGL) virtual
temple-visit experience — for the owner's own private use only, with a
backend server the owner runs themselves, deployed privately so the owner can
reach it remotely. Never shared/published/monetized. Full PRD:
docs/product/vieng-chua-online.prd.md.

## Status: Milestone 3 (presence server) done. Milestone 4 (private deploy) next.
Two projects now: `app/` (Vite + TS + Three.js client) and `server/` (Node +
TS + `ws` presence server). To run locally: `npm run dev` in `server/`
first (default `ws://localhost:8787`), then `npm run dev` in `app/`. The
client shows a live "N người đang viếng chùa" count from the real server —
try two browser tabs to see it change. `app/public/sansatemple/`
(gitignored, decision 0006) must be populated first — run
`scripts/fetch-sansatemple-assets.sh` from the repo root if it's empty.

## Decisions made (see docs/memory/decisions/) — read these before re-deciding anything
1. **0001** — Personal use only, never shared/published/monetized.
2. **0002** — ~~Electron~~ **superseded by 0005**.
3. **0003** — Keep original images/3D models/audio as-is; only translate text
   to Vietnamese.
4. **0004** — Build an owner-run backend server (not sansatemple.com's real
   one) for multiplayer/presence features.
5. **0005** — Web app (browser client + own backend), not Electron.
   Deploy target: private cloud, reachable only by the owner (deployment
   itself is a red-tier action — ask before doing it).
6. **0006** — Reused binary assets live in `app/public/sansatemple/`,
   gitignored, fetched by `scripts/fetch-sansatemple-assets.sh`, never
   committed.

## Milestone 1 results (asset/protocol recon — read before touching the server)
- docs/specs/milestone-1-asset-protocol-recon/asset-manifest.md — every 3D
  model/texture/audio/font URL found.
- docs/specs/milestone-1-asset-protocol-recon/protocol-notes.md — the real
  WebSocket endpoint (`wss://sansa-realtime.wlsdnjs0529.workers.dev/presence`,
  a small Cloudflare Workers presence service — small buildable scope, not a
  heavyweight game server), connection flow, per-visitor state shape, and
  message-type vocabulary (hello/sync/delta/ack/move/stand/seat/bow/bead/
  incense/incense-join/incense-start/room-switch), all inferred from reading
  the client bundle (no live traffic was ever captured — the real site
  stayed stuck reconnecting throughout recon).
- **Excluded, not just deferred**: the original's real-money donation flow
  (복전함/공양미), tied to the original developer's personal bank account +
  KakaoPay. Owner separately confirmed this exclusion stands, and flagged a
  *future* idea: a donation feature on the owner's own transparent public
  account — not scoped yet, not part of any current milestone. See
  docs/memory/open-questions.md.

## Milestone 2 results (Vietnamese client — read before touching app/)
- `app/src/moktak.ts` + `moktak.test.ts` — pure strike/autoplay controller,
  TDD'd first, no Three.js/DOM dependency.
- `app/src/i18n.ts` + `i18n.test.ts` — Vietnamese string lookup table.
  Deliberately does NOT use the extracted `SansaQuietUI-Core.woff2` font for
  Vietnamese text (see comment in `style.css`): a Korean UI font likely
  lacks Vietnamese diacritic glyphs. System font stack used instead.
- `app/src/scene.ts` — loads buddha/avalokitesvara/mahastamaprapta/pine/monk
  `.glb` models (auto-scaled/positioned via bounding boxes, since the
  original scene's exact layout/scale is unknown) + ground texture, with
  OrbitControls. Exposes click-to-strike on the moktak sprite via raycasting.
- `app/src/main.ts` — wires DOM UI, moktak audio (`Audio` element), and the
  controller together.
- **Real bug hit and fixed**: the original `.glb` files use Meshopt
  compression (`EXT_meshopt_compression`). `GLTFLoader` throws
  `"setMeshoptDecoder must be called before loading compressed files"`
  unless wired up with the `meshoptimizer` npm package's `MeshoptDecoder`.
  Already fixed in `scene.ts` — if a *different* loading error shows up
  later, don't assume it's the same cause.
- Verified by taking a real screenshot through REA/CDP (not just "it
  compiles") — scene renders correctly, Vietnamese UI confirmed by both the
  screenshot and the accessibility tree.
- **Not checked**: the actual moktak click → sound + pulse animation,
  end-to-end in a live browser. `capture_browser_scenario`'s connect mode
  timed out attaching to the CDP target already in use by passive
  inspection — didn't fight it further. Code review + the unit-tested
  controller logic make this low-risk, but a manual click-test by the owner
  is worth doing on first run.

## Milestone 3 results (presence server — read before touching server/)
- `server/src/presenceRoom.ts` + `.test.ts` — pure join/leave/count logic,
  TDD'd first, no socket dependency.
- `server/src/server.ts` — `ws`'s `WebSocketServer`, broadcasts
  `{"type":"presence","count":N}` to every connected client whenever
  someone joins/leaves. Run with `npm run dev` (watch mode) or `npm start`.
  Port from `PORT` env var, default 8787.
- `app/src/presence.ts` + `.test.ts` — client-side WebSocket wrapper:
  connecting/online/offline status callback, auto-reconnect with backoff,
  TDD'd with a fake `WebSocket` + fake timers. Wired into `main.ts`,
  replacing the old hardcoded "1/100".
- Live-verified end-to-end (not just unit tests): ran the real server,
  opened 3 real browser tabs of the client, watched the header actually
  read "3 người đang viếng chùa", confirmed by screenshot.
- **Not checked**: the offline/reconnect UI path was only exercised with
  fake timers in `presence.test.ts`, not by actually killing the running
  server while a tab was open.
- Deliberately out of scope per the spec: avatar position sync, rendering
  other visitors in the 3D scene, rooms/instances — this is just a
  player-count service. See docs/specs/milestone-3-presence-server/spec.md.

## What's NOT done yet (pick up here)
- Milestone 4 (private cloud deploy) not started — remember deployment
  itself needs the owner's explicit go-ahead (red-tier action). Need to
  pick a hosting provider for both `app/` (static) and `server/` (needs a
  long-running WebSocket-capable host, not pure static hosting) — not
  chosen yet.
- Open questions still unresolved (docs/memory/open-questions.md and the
  PRD's own Open Questions): access control for the private deployment,
  hosting provider choice, the future public-donation-account idea (not
  scoped).
- Still running from this session, harmless to reuse or restart rather
  than force-killing broadly: a throwaway Chrome debug instance (port
  9333, several tabs open — each an active presence connection, so the
  live count reflects however many of those tabs are still open), the Vite
  dev server (port 5184), and the presence server (port 8787).

## Constraints to respect going forward
- Never bypass any DRM/anti-copy protection on sansatemple.com; only use
  assets a normal browser session can fetch publicly.
- Never share, publish, deploy publicly, or monetize this app or its assets.
- Cloud deployment needs the owner's explicit go-ahead at that time — don't
  just deploy it.
- Read docs/memory/open-questions.md, docs/product/vieng-chua-online.prd.md,
  and the decisions/ folder before continuing; don't re-ask what's already
  decided there.
