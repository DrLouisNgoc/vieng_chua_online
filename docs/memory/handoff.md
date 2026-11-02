# Handoff

## Goal
Build a personal Vietnamese-localized clone of https://sansatemple.com
("산사, 잠깐 쉬어가요" — a Korean virtual temple-visit / rest-and-meditation
web experience) as a standalone Electron app, for the owner's own private use,
so they can add their own features on top.

## Status: discovery/interview phase, not yet started building
No code has been written. No git repo exists yet in this folder. Only
`docs/memory/` exists so far.

## Decisions made (see docs/memory/decisions/)
1. **0001** — Personal use only: app will never be shared, published, or
   monetized, because it reuses sansatemple.com's original copyrighted assets.
2. **0002** — Package with Electron (not Tauri, not web-only).
3. **0003** — Keep original images/3D models/audio as-is; only translate text
   to Vietnamese.

## What's been checked
- Fetched the live site: it's a JS-driven SPA, currently showing a Korean
  loading screen ("법당을 여는 중" — "opening the dharma hall"). Real content
  (text, assets, interactivity) lives in JS, not static HTML — needs real
  browser/JS inspection, not a plain fetch.
- Checked `robots.txt`: `Allow: /` for all user agents, no crawl restriction.
  (This says nothing about reuse/copyright licensing — see decision 0001.)
- No ToS was found/checked yet.

## What's NOT done yet (pick up here)
- Never actually inspected the site's JS bundle, 3D/WebGL assets, or text
  strings — the Chrome browser automation tool disconnected mid-session
  before this step. **Next action: reconnect a browser tool (claude-in-chrome
  or REA's browser capture) and inspect the live page — structure, asset
  URLs, text locations.**
- Feature list is only loosely picked, not spec'd: scene/content
  customization, save progress + personal notes, custom meditation
  audio/music. Need to ask the owner for concrete detail on each.
- No decision yet on: where saved progress/notes are stored (flat file?
  SQLite?), and how Vietnamese text swaps in (edit the extracted JS/data
  directly vs. build an i18n layer).
- Not asked yet: whether to follow the full gated spec → design → plan →
  build process from global CLAUDE.md, or keep this lightweight since it's a
  solo hobby project.
- Electron project itself has not been scaffolded.

## Constraints to respect going forward
- Never bypass any DRM/anti-copy protection on sansatemple.com; only use
  assets a normal browser session can fetch publicly.
- Never share, publish, deploy publicly, or monetize this app or its assets.
- Read docs/memory/open-questions.md and the decisions/ folder before
  continuing; don't re-ask what's already decided there.
