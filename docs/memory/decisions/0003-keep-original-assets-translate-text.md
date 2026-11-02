# Decision 0003: Keep original assets, translate text to Vietnamese

Date: 2026-11-02

## Decision
Reuse sansatemple.com's original images, 3D models, and audio as-is. Only the
text content is localized into Vietnamese.

## Why
Owner's explicit choice over "rebuild everything from scratch with original
assets." See decision 0001 for the use-restriction that this choice depends
on.

## Consequences
- Asset extraction must only use what a normal browser session can fetch
  publicly — no circumventing any protection the site has.
- Text strings need to be located in the site's JS/data (likely bundled, not
  in static HTML — the site serves a loading screen before its SPA content
  renders) and replaced with Vietnamese translations.
