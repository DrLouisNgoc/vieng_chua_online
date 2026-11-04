# Milestone 4: movement + character screen (chuasen.com-inspired UX)

PRD: docs/product/vieng-chua-online.prd.md (Milestone 4)
Decision: docs/memory/decisions/0007-chuasen-ux-reference.md — read first,
sets exactly how much of chuasen.com this milestone may draw on.

## Goal
Fix the gap the owner flagged after trying the Milestone 2/3 build: no
avatar movement, and a visually flat UI. Add the two missing pieces,
inspired by chuasen.com's UX but built on sansatemple.com's own assets
(decision 0003 unchanged — no sansatemple asset is replaced):
1. Click-to-move avatar in the 3D scene (this was literally promised by the
   original's own hint text, translated in Milestone 2, but never built —
   see the bug noted in handoff.md 2026-11-03).
2. A pre-entry "character screen" (name + gender + robe color) using a
   parametric SVG avatar, reproduced from chuasen.com's own markup/CSS
   mechanism (extracted 2026-11-03, see below), colored and posed with our
   own CSS — not a pixel-identical copy of their screen.
3. A visual-depth pass on the existing HUD/panel CSS (cards, layered
   shadow, warmer palette) — small, targeted, not a full redesign.

## Scope
**In**:
- Click (or tap) on the ground plane moves the monk.glb avatar to that
  point with a simple walk (lerp position over a fixed duration — no
  pathfinding/obstacle avoidance needed, the ground is open).
- Camera orbit target follows the avatar as it moves.
- A screen shown before the 3D scene (or as an overlay while it loads
  behind it) with: a name field ("Pháp danh"), a gender toggle (Nam/Nữ),
  a robe-color swatch picker (reusing chuasen's 5-swatch idea), a live SVG
  avatar preview that reacts to both, and a "Vào chùa" button that enters
  the scene.
- The entered name is shown in the header next to "Sơn tự" (local-only —
  no server round-trip; the presence server still only tracks a count, per
  Milestone 3's explicit scope).
- HUD/panel CSS gets a depth pass: layered shadows, a subtle gradient,
  warmer tones — targeted at `.hud-top`, `.hint`, `.moktak-panel`.
- Hint text restored to mention movement now that it's real (undo the
  2026-11-03 "click nền để di chuyển" removal, now that it's true).

**Out** (per decision 0007 and the PRD): login/account persistence,
day/night sky cycle, lanterns, background music, level/streak progress,
referral system, "Kiểu áo" family toggle (Tràng xám/lam/Bà ba/Áo dài —
chuasen's SVG supports a `data-family` switch but it only hides/shows a
collar/cross/button detail on an otherwise-identical robe shape; low value
for the effort, skip for now), pathfinding/obstacle avoidance, other
visitors' avatars appearing in the scene (still presence-only — decision
unchanged since Milestone 3).

## Design
- `app/src/avatar-svg.ts`: the extracted SVG markup as a template string
  (gender/color-parametric via `data-look` attribute and inline CSS custom
  properties, matching chuasen.com's own mechanism) + the handful of CSS
  rules needed to render it (adapted into `style.css`, not copied
  verbatim — our own class names under an `avatar-` prefix to avoid
  colliding with chuasen's `onb__`/`fg-` naming, since this is our own
  reimplementation of their *approach*, not an embed of their page).
  Source: chuasen.com's `assets/index-*.js`, extracted via REA + direct
  fetch 2026-11-03 — see decision 0007. Original dropped once ported; this
  project does not re-fetch chuasen.com at runtime or build time.
- `app/src/onboarding.ts`: pure state/logic (name validation, selected
  gender, selected color) — TDD'd first, no DOM dependency, same pattern
  as `moktak.ts`.
- `app/src/movement.ts`: pure logic — given a clicked ground point and the
  avatar's current position, return a walk target + duration. TDD'd first,
  no Three.js dependency (raycasting itself stays in `scene.ts`, same
  pattern as the existing moktak click-raycast).
- `scene.ts`: wires the ground-click raycast to `movement.ts`, lerps
  `monk.glb`'s position each frame while a walk is active, updates
  `controls.target` to follow.
- `main.ts`: renders the onboarding screen first; on "Vào chùa", hides it
  and starts `createTempleScene` (already async-loaded) using the chosen
  name/gender/color.

## Acceptance
- Opening the app shows the character screen first; choosing a name +
  gender + color updates the live SVG preview; "Vào chùa" enters the 3D
  scene with that name shown in the header.
- Clicking anywhere on the ground moves the avatar there smoothly (not a
  teleport), confirmed by an actual in-browser check (screenshot sequence
  or equivalent), not just unit tests.
- `onboarding.test.ts` and `movement.test.ts` cover the pure logic,
  written before the implementation (TDD).
- Screenshots at 375px and 1440px confirm the new screen and the HUD depth
  pass don't break either breakpoint (per the global UI-change evidence
  rule).
- `npm test` stays green.

---
*Status: in progress — scope changed substantially at the owner's request
(keyboard-only movement, third-person camera, procedural temple grounds,
76x54 main hall, moktak panel removed). The current state, every scope
change, rulings and open problems are in status.md; this file is kept as
the original plan.*
