# Log

- 2026-11-02: Project started. Goal clarified via interview: personal
  Vietnamese-localized Electron clone of sansatemple.com's virtual-temple
  experience, keeping original assets, personal-use-only. Browser tool
  disconnected before technical site inspection could happen. Session handed
  off to a fresh Claude session; see handoff.md.
- 2026-11-02: Milestone 1 (asset & protocol recon) done. Downloaded and
  grepped the real game-*.js bundle: found the full 3D model/texture/audio
  asset list, the real WebSocket endpoint
  (wss://sansa-realtime.wlsdnjs0529.workers.dev/presence — a small
  Cloudflare Workers presence service, not a heavy game server), and the
  message-type vocabulary (hello/sync/delta/ack/move/stand/seat/bow/bead/
  incense/incense-join/incense-start/room-switch). Recommended 목탁 (moktak)
  as the MVP interaction since it's client-local. Also found and excluded a
  real-money donation flow tied to the original developer's personal bank
  account/KakaoPay — not carried into this project. See
  docs/specs/milestone-1-asset-protocol-recon/. Next: owner confirms moktak
  as the MVP interaction, then Milestone 2 (Vietnamese client).
- 2026-11-02: Git repo initialized, baseline commit + `baseline` tag created.
  Live-inspected sansatemple.com via REA (CDP) — discovered it's a real
  multiplayer 3D app (Three.js, live player count, reconnect/server-select
  UI), not a static page. Owner decided: build an owner-run backend (not
  connect to the real one), deployed privately on cloud; and switched target
  from Electron to a plain web app (decision 0005 supersedes 0002). Ran
  /dev-team:plan-prd; wrote docs/product/vieng-chua-online.prd.md. Next:
  /dev-team:spec for Milestone 1 (asset & protocol recon).
- 2026-11-02: Owner confirmed moktak as MVP interaction and said to proceed.
  Also clarified the earlier donation-feature exclusion: original developer's
  payment info stays excluded, but owner wants a transparent public donation
  account as a *future* feature on their own account — flagged as a separate
  future scoping question, not acted on now (see open-questions.md).
  Milestone 2 built: scaffolded `app/` (Vite + TS + Three.js + vitest), TDD'd
  `moktak.ts` (strike/autoplay controller) and `i18n.ts` (Vietnamese string
  table) first, then built `scene.ts` (loads reused buddha/bodhisattva/pine/
  monk .glb models + ground texture, orbit camera) and `main.ts` (wires UI +
  audio). Downloaded real assets into `app/public/sansatemple/` (gitignored,
  decision 0006) via `scripts/fetch-sansatemple-assets.sh`. Hit and fixed a
  real bug: original `.glb` files need Meshopt decompression
  (`meshoptimizer` package + `setMeshoptDecoder`). Verified visually via a
  screenshot through REA/CDP — scene renders correctly with Vietnamese UI.
  Tests + typecheck green. Next: Milestone 3 (owner-run backend — mainly a
  live player-count/presence service, since moktak itself is client-local
  and needs no server round-trip).
- 2026-11-02: Milestone 3 built. New `server/` project (Node + TypeScript +
  `ws`, run via `tsx`): `presenceRoom.ts` (pure join/leave/count logic,
  TDD'd first) wrapped by `server.ts` (WebSocketServer, broadcasts
  `{"type":"presence","count":N}` on every connect/disconnect). Client got
  `app/src/presence.ts` (TDD'd with a fake WebSocket: connecting/online/
  offline states, auto-reconnect with backoff) wired into `main.ts`,
  replacing the old hardcoded "1/100" with the real header count. Live
  end-to-end check: ran the server, opened 3 real browser tabs of the
  client, watched the header count go to "3 người đang viếng chùa" for
  real, confirmed by screenshot. Milestone 3 marked done in its spec. Next:
  Milestone 4 (private cloud deployment) — remember this needs the owner's
  explicit go-ahead before actually deploying anything (red-tier action).
- 2026-11-02: Owner asked about current UI state, then said to stop the
  session here. Nothing further changed; git is clean (all work through
  Milestone 3 committed). Session closed. Resume with Milestone 4
  (hosting provider choice + access control, then owner's go-ahead to
  deploy) or UI polish/missing original interactions, per owner's next
  request.
