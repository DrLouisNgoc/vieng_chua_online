# Milestone 5 status

Phase: **built and reviewed** (2026-11-05). Gate mode auto from AGENTS.md.
Spec, design and plan approved by the owner 2026-11-05.

## Log
- 2026-11-05: owner interview (3 rounds), decisions D1-D10 in spec.md.
- 2026-11-05: spec approved and merged; design.md, plan.md written.
- 2026-11-05: owner chose "build all 11 steps" and gate mode auto.
- 2026-11-05: built on branch build/milestone-5-interactions (plan steps
  1-11); reviewed own diff (removed dead IDLE_POSE).
- 2026-11-07: owner: the seated pose spread the knees too wide ("rạng
  hết háng, phải ngồi kiết già"). SEATED retuned: knees 0.25 apart
  (was 0.55), shins crossed (y ±0.7), hands together in the lap; checked
  from front/top/side and on a hall cushion (seated, beads, greet, bow).
  A test now guards knee spread and crossed shins.

## Acceptance criteria (spec.md) — evidence
Browser runs drive the real app (Playwright + system Chrome) with a
temporary teleport hook (removed before commit); screenshots in the
session scratchpad, not committed.
1. Sit: near a hall cushion prompts "E Ngồi thiền"; E seats the avatar on
   the cushion facing the altar; S stands it up (prompts back to
   "Ngồi thiền"). Pass at 1440 and 375.
2. Greeting: Q joins palms standing and seated, returns after 1.5 s. Pass.
3. Bow: "Lạy Phật" offered seated and in the statue zone only (start
   point offers only Q/B). Pass.
4. Beads: B x3 -> "Hạt 3/108 · tổng 3"; total read back from
   localStorage after reload = 3. Wrap 108 -> 1 covered by unit test. Pass.
5. Broom: "Cầm chổi" at the broom spot, then only "Dựng chổi"; same-view
   screenshots before/after walking with the broom show the walked-over
   leaves gone, others kept. Pass (leaves are small; see open problems).
6. Buttons: bow triggered by clicking its button; bar is one row at 375
   and centred at 1440. Pass.
7. Tests: 153 pass; `tsc --noEmit` clean.
8. Render timing (60 synchronous renders, two alternating runs each):
   main 30.0-32.5 ms, Milestone 5 29.2-33.2 ms — no measurable change.

## Rulings (decided alone — say if wrong)
- Ruling: milestone numbering — interactions = 5, visitor sync = 6, the
  private deploy moves to 7 — why: the deploy was "Milestone 5" only in
  handoff notes, never in the PRD table — cost if wrong: renumber docs.
- Ruling: reach distances, statue zone, broom spot, leaf sources/rate/cap,
  sweep radius, seat facing — values listed in design.md "Rulings" — why:
  design details the owner left open — cost if wrong: constants in
  temple-layout.ts.
- Ruling: leaves fall under trees (avenue + banyan), not over the whole
  yard — why: the 150x185 yard would make 120 leaves invisible — cost if
  wrong: change LEAF_SOURCES.
- Ruling: new strings as Vietnamese literals in INTERACTION_TEXT, not in
  i18n.ts (spec deviation) — why: i18n is keyed by original Korean strings
  that were never captured for these actions — cost if wrong: move them.
- Ruling: standing bow is a waist bow with joined palms, not kneeling
  (spec said "kneel-and-bow") — why: reads clearly on the short-legged rig
  and needs no floor contact; the seated bow folds to the floor — cost if
  wrong: a kneeling pose in body-pose.ts.
- Ruling: greeting is not offered while holding the broom (design only
  ruled out beads) — why: both hands are on the handle — cost if wrong:
  one condition in interaction-state.ts / interaction-prompts.ts.
- Ruling: leaves start at 90 and cap at 160 (design: 40 / 120), yellow /
  olive / dark brown, 0.32 x 0.2 — why: the first browser run showed
  orange leaves vanishing into the terracotta paving and too few per
  tree — cost if wrong: LEAF_INITIAL / LEAF_CAP / LEAF_COLORS.
- Ruling: interaction wiring lives in interaction-runtime.ts, not
  scene.ts (design put it in scene.ts) — why: scene.ts was already ~540
  lines — cost if wrong: none functionally.

## Process notes
- Plan step 4 (interaction-targets) code was written before its failing
  test was run; all other pure modules went red first.
- The bead counter's pure part was built in step 5 (prompts import its
  constant), ahead of plan step 8.

## Open problems
- Leaves are small at the default camera distance; easy to miss from far.
- The bead string is hidden behind the body from the default (behind)
  camera; visible only when the camera is turned.
- Seated hips sink slightly into the cushion top; fine at normal zoom.
- Not checked: banyan seats in the browser (unit-tested facing only);
  real touch input on a phone (only 375 px viewport with mouse clicks);
  real Unikey keyboard for E/Q/B.
