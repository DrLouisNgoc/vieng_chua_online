# Milestone 6 status

Phase: **built and reviewed** (2026-11-07, gate mode auto).

## Log
- 2026-11-07: owner interview, decisions E1-E4; decision 0010 (robe tint).
- 2026-11-07: spec/design/plan written; built on branch
  milestone-6-visitors (plan steps 1-9).

## Acceptance criteria (spec.md) — evidence
Two Chrome windows driven by Playwright against the real dev servers
(server `npm run dev`, app `npm run dev`), with a temporary teleport hook
(removed before commit). Screenshots in the session scratchpad.
1. B sees A ("An", robe 0 = blue) with a name label; B's own robe is its
   chosen green; header "2 người đang viếng chùa". A walking shows in B.
   Pass at 1440 and 375. Latency not timed precisely: 100 ms server tick
   + 100 ms client throttle + smoothing.
2. A seated, counting beads (label "An · 4 hạt"), greeting, holding and
   sweeping with the broom all show in B. Pass.
3. B standing on A's cushion is offered only Q/B, not "Ngồi thiền". The
   forced race is covered by the server integration test (`seat-refused`)
   and client unit tests (onSeatRefused, standUp); not forced in a browser.
4. Closing A: B's header drops to 1 and A's avatar is gone after 1.5 s.
   Pass.
5. Server: 44 tests (validation table, room, two-client integration incl.
   malformed messages and a 5 KB frame closing the socket). Pass.
6. app 178 tests, server 44 tests, `tsc` clean in both. Pass.
7. Render timing, one remote visitor vs none, a second window open in
   both cases, two runs each: with remote 66.2 / 65.7 ms, without 47.1 /
   62.1 ms. **Inconclusive**: somewhere between no cost and ~20 ms on this
   Intel UHD with two windows rendering; the remote adds 27 draw calls
   (420 -> 447). Needs a measurement on two machines.

## Rulings (decided alone — say if wrong)
- Ruling: show a visitor's bead total beside their name while they count —
  why: the original sansatemple sends beads { visible, total } per visitor
  — cost if wrong: drop it from labelText.
- Ruling: protocol, full-list broadcast, seat claims on `state` — see
  design.md "Rulings".
- Ruling: extended presence.ts instead of a new visitor-client.ts (design
  deviation) — why: same socket and reconnect logic, smaller change — cost
  if wrong: a rename.
- Ruling: remote avatars switch poses without the 0.25 s blend the own
  avatar uses — why: simpler; poses still change at most 10 times a
  second — cost if wrong: add blending in remote-visitors.ts.
- Ruling: SEAT_COUNT and WORLD_LIMIT duplicated in server/src/protocol.ts,
  guarded by an app test that imports both and compares — why: two npm
  packages, no shared module yet — cost if wrong: a shared package.

## Open problems
- Render cost of remote visitors not settled (criterion 7).
- Name labels are hidden behind tree canopies (depth-tested on purpose).
- Each visitor sees their own broom standing at the broom spot even while
  another visitor sweeps with "theirs" (E3: per-visitor yard) — may look
  odd to the owner.
- Presence count includes people still on the "Vào chùa" screen.
- Not checked: two real machines / phones; a slow network; more than 2
  visitors at once.
