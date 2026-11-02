# Viếng Chùa Online

## Problem
The owner (sole user) wants to experience sansatemple.com's 3D virtual
temple-visit app, but it's Korean-only and gives no way to customize it.
Two blockers today: a language barrier (no Vietnamese UI), and no ability to
extend the experience with personal features, since it's someone else's
closed product. Left unsolved, the owner simply cannot use or build on this
experience at all.

## Evidence
- Assumption — needs validation via the owner actually using the MVP; this
  is a personal itch project, not researched against other users.
- Confirmed by direct technical inspection this session: sansatemple.com is
  a live Three.js/WebGL multiplayer app (room selection, live player count,
  reconnect-on-drop), not a static page — see docs/memory/decisions/0004.

## Users
- **Primary**: the owner, as a private individual, running their own browser
  client against their own backend, from any of their own devices.
- **Not for**: anyone else. Per docs/memory/decisions/0001, this is never
  shared, published, or monetized — single-tenant, owner-only by design.

## Hypothesis
We believe **a Vietnamese-localized web client (reusing sansatemple.com's
original 3D/audio assets) talking to a small owner-run backend** will
**let the owner experience and extend the virtual-temple concept in their
own language, under their own control**, for **the owner**.
We'll know we're right when the owner can open the deployed web app from a
browser, see the original 3D temple scene rendered with Vietnamese UI text,
see their own live presence reflected via the owner's backend, and perform
at least one original interaction (e.g. striking the moktak, or bowing).

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| End-to-end load | Scene renders with Vietnamese UI, connected to owner's backend | Manual check by owner, from a remote browser |
| One interaction works | 1 of {염불 듣기 / 절하기 / 목탁 / 염주} fully functional round-trip through the owner's server | Manual check by owner |
| Presence reflects reality | Player count shown matches actual connected sessions | Manual check, 2 browser tabs/devices |

## Scope
**MVP** — Owner opens the web app remotely in a browser; sees the original
3D temple scene (reused assets) with a Vietnamese UI; sees a live player
count from the owner's own backend (not sansatemple.com's); performs at
least one original interaction end-to-end through that backend.

**Out of scope**
- Every other interaction besides the one chosen for MVP — deferred until
  the client+server pipeline is proven once.
- Custom/owner-authored scenes or content — deferred; MVP reuses the
  original scene only.
- Custom meditation audio/music — deferred; MVP reuses original audio only.
- Save progress / personal notes — deferred past MVP (owner considered
  pulling this into MVP and chose to defer it).
- Any connection to, or protocol compatibility with, sansatemple.com's real
  backend — explicitly ruled out, see decision 0004.
- Public/shared deployment, accounts for anyone but the owner — ruled out,
  see decision 0001.

## Delivery Milestones
| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Asset & protocol recon | Original 3D models/textures/audio/text strings extracted from the game bundle; enough of the client-server message shape understood to design a minimal own-server protocol | pending | — |
| 2 | Vietnamese client (single interaction, no live multiplayer yet) | Owner can load the 3D scene with Vietnamese UI in a browser, locally | pending | — |
| 3 | Owner-run backend (presence + the one MVP interaction) | Client talks to the owner's own server for live player count and the chosen interaction | pending | — |
| 4 | Private cloud deployment | Owner can reach the running app remotely, from their own devices only | pending | — |

## Open Questions
- [ ] Exactly which single interaction (염불 듣기 / 절하기 / 목탁 / 염주) is
      easiest to extract and reimplement first? — needs asset/protocol recon
      (Milestone 1) to answer.
- [ ] What access control protects the privately-deployed server (decision
      0005 flagged this as newly relevant — a URL alone is not access
      control)? — needs a decision before Milestone 4.
- [ ] Where do extracted original assets live during development (local
      only vs. committed to the repo)? Committing copyrighted third-party
      binary assets to git has its own tradeoffs (repo size, history)
      — needs a decision before Milestone 1 produces files.
- [ ] Hosting provider/cost for the private cloud deployment — not yet
      chosen.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Copyright exposure from reusing sansatemple.com's original 3D/audio/text assets | Low (strictly private, non-distributed use) | High if it ever leaked/was shared | Hold the line on decision 0001 (never shared/published); no DRM circumvention; store assets only in the private dev environment |
| Game bundle is heavily minified/obfuscated, making asset/protocol extraction slow or incomplete | Medium | Medium — could block Milestone 1 | Use static JS recovery tooling first; fall back to reimplementing a visually-similar scene with extracted raw assets (models/textures/audio) even if exact bundle logic isn't recoverable |
| Scope creep: "own backend" is a real multiplayer server, not a toy | Medium | Medium — could balloon effort | MVP backend deliberately covers only presence count + one interaction, nothing else |
| Privately-deployed server reachable by anyone who finds the URL | Medium | Medium | Resolve the access-control open question before Milestone 4; cloud deployment itself requires the owner's explicit go-ahead at that time (red-tier action) |

---
*Status: DRAFT — requirements only. Implementation planning pending via /dev-team:spec.*
