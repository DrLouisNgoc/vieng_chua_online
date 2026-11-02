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
