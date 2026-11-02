# Decision 0006: Extracted original assets are a gitignored local cache, not committed

Date: 2026-11-02

## Decision
Binary assets reused from sansatemple.com (3D models, textures, audio, the
original font) are fetched by a small local script into a gitignored
directory (`app/public/sansatemple/` — Vite's public dir, so the dev server
can serve them directly), never committed to git.

## Why
Resolves the open question from the PRD/Milestone 1. Committing a third
party's copyrighted binary assets permanently into version control history
is a heavier, harder-to-undo footprint than keeping them as a local,
re-fetchable cache — and this project is explicitly personal/never shared
(decision 0001), so there's no deployment step that needs them baked into
the repo artifact itself; the running app can read them from this local
directory directly.

## Consequences
- A fetch script (`scripts/fetch-sansatemple-assets.*`) records the asset
  URLs from docs/specs/milestone-1-asset-protocol-recon/asset-manifest.md
  and re-downloads them on demand.
- `.gitignore` excludes `app/public/sansatemple/`.
- The private cloud deployment (decision 0005) will need its own story for
  getting these assets onto the deployed host — not solved yet, deferred to
  the deployment milestone.
