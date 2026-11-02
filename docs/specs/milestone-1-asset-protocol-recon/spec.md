# Milestone 1: Asset & protocol recon

PRD: docs/product/vieng-chua-online.prd.md (Milestone 1)

## Goal
Produce two documents that Milestones 2–3 build from:
1. **Asset manifest** — every 3D model/texture/audio/font/UI-text asset URL
   the client loads, what it's for, and its format.
2. **Protocol notes** — what the client sends/receives to show live player
   presence and to perform one chosen interaction (염불 듣기 / 절하기 / 목탁 /
   염주), concrete enough to design a minimal owner-run server from.

No app code is written in this milestone — it's pure investigation, output
is markdown + saved reference assets in the local dev environment only (not
committed to git — see PRD open question on asset storage, deferred: keep
everything from this milestone local/untracked for now).

## Method
- Reuse the throwaway Chrome (CDP debug port) already used for the first
  screenshot; let the scene fully load (past the "잠깐 쉬고 있어요" screen)
  before capturing.
- `inspect_web_page` with `include_script_sources` for a fuller resource/
  script inventory than the first 5s snapshot.
- Pull `assets/game-*.js` to a local file via curl; run
  `recover_javascript_sources` (REA, Wakaru) on it to get readable modules;
  search recovered modules for: asset URL patterns (`.glb`/`.gltf`/`.ktx2`/
  `.mp3`/`.ogg`/`.webp`/`.png`/`.jpg`), Korean UI strings, and
  WebSocket/HTTP endpoint strings (room join, presence, interaction actions).
- Record an `observe_web_session` window while manually triggering one
  interaction (if feasible without login) to see its network/WebSocket
  shape.

## Out of scope for this milestone
- Actually implementing anything.
- Full coverage of every interaction — only the one chosen for the MVP needs
  protocol-level detail; the others just need to be named/located for later.

## Acceptance
- `docs/specs/milestone-1-asset-protocol-recon/asset-manifest.md` exists,
  listing asset URLs grouped by type with notes on what each is.
- `docs/specs/milestone-1-asset-protocol-recon/protocol-notes.md` exists,
  describing the presence mechanism and the chosen interaction's
  request/response or message shape, with explicit "unknown" markers for
  anything not recoverable from static/passive inspection alone.
- Owner has picked which interaction is the MVP one (open question from the
  PRD) — this milestone's findings should make that an easy, informed choice
  rather than guesswork.

---
*Status: done. See asset-manifest.md and protocol-notes.md. Owner's pick of
the MVP interaction (목탁 recommended) is still pending confirmation.*
