# Decision 0007: chuasen.com as a secondary UX/feature reference, scoped narrowly

Date: 2026-11-03

## Decision
sansatemple.com stays the primary asset/scene source (decision 0003
unchanged — its 3D models, textures, audio are still "keep as-is, only
translate text"). Additionally, borrow specific UX/feature *patterns* from
https://chuasen.com/ (a live, actively-operated Vietnamese "online temple"
web app — Vite/Rolldown + Three.js, has analytics/bot-detection, a
login/character-persistence system, and a much more polished UI than the
sansatemple-derived clone currently has):

1. **Click-to-move avatar in the 3D scene** — sansatemple's own original
   also implies this (the untranslated hint text said so — see the bug
   fixed in this session), but it was never built. Build it now, using the
   existing monk.glb model; no new assets needed.
2. **A pre-entry "character creation" screen** (name + enter), styled with
   more visual depth/layering (cards, gradients, warm brown/gold palette)
   than the current flat parchment-green UI — inspired by chuasen.com's
   layout, not a pixel copy.
3. **The character avatar portrait on that screen**: chuasen.com renders
   this as hand-authored inline SVG illustration embedded in their JS
   bundle (not a raster image file) — gender/outfit/color variants are
   parametric. Owner explicitly confirmed, after being told this means
   extracting their SVG markup/path code from the bundle (not just
   downloading a media file like decision 0003/0006 did for sansatemple),
   that they still want this done.

## Why
Owner compared the running clone to chuasen.com and found it visually flat
and missing movement. Interviewed in rounds (see log.md 2026-11-03) to scope
exactly how much of chuasen.com to pull in, given it's a materially
different kind of source than sansatemple.com (live, monitored, Vietnamese,
commercial-feeling vs. sansatemple's quieter Korean demo). Landed on:
sansatemple remains the scene/asset backbone; chuasen.com is a reference for
UX patterns and, specifically and narrowly, the avatar illustration's SVG
code for the character screen.

## Consequences
- Still bound by decision 0001 (personal use only, never shared/published/
  monetized) — this is the same justification already extended to
  sansatemple's assets, now also covering chuasen.com's SVG illustration.
- Scope stays narrow: just the avatar SVG + UX layout patterns (movement,
  card-based screens). NOT sky/lanterns/music/progress/referral/login
  systems — those are out unless separately scoped later.
- chuasen.com's bot-detection (DataFast) already flagged the automated
  Chromium session that inspected it; expect similar flags on any follow-up
  fetch of their bundle/assets. Doesn't block read access so far, but is a
  reason to keep this to a one-time, narrowly-scoped extraction rather than
  an ongoing scraping relationship.
- Next: locate the SVG/path data in chuasen.com's `index-BpEzGqIY.js` (or
  wherever the character-picker component lives) via REA, extract just the
  avatar illustration markup, then build the click-to-move + character
  screen features in `app/`.
