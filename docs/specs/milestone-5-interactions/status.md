# Milestone 5 status

Phase: **design written, waiting for the owner's approval** (gated).
Spec approved by the owner 2026-11-05.

## Log
- 2026-11-05: owner interview (3 rounds), decisions D1-D10 in spec.md.
- 2026-11-05: spec approved and merged; design.md written.

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
