# Milestone 5: in-temple interactions (local)

PRD: docs/product/vieng-chua-online.prd.md (Milestone 5)
Interview with the owner: 2026-11-05, three rounds (decisions below).
Follow-up: Milestone 6 (other visitors visible, with their actions).

## Goal
Give the visitor things to do in the temple besides walking: sit in
meditation on a cushion, greet with palms joined, bow to the Buddha, count
prayer beads, and sweep fallen leaves off the yard. In this milestone every
action runs only on the visitor's own machine; Milestone 6 makes them
visible to other visitors.

## Decisions from the interview (owner, 2026-11-05)
- D1. Actions in scope: sit (meditate on a cushion), palms-joined greeting,
  bow, prayer beads, sweeping the yard. Sweeping is new (not in the
  original sansatemple.com); incense offering stays out.
- D2. Other visitors must eventually see you and your actions. Order:
  actions first, local only (this milestone); visitor sync after
  (Milestone 6).
- D3. Poses are made in code on monk.glb's own rig (bone rotations, the
  same way as the walk cycle). Mixamo animations may replace them later
  (decision 0009) — keep pose data separate from the code that plays it.
- D4. Trigger: walk near the thing, a prompt appears (key + on-screen
  button, so it works on a phone too).
- D5. Greeting and bowing are two actions. Palms-joined greeting
  ("chắp tay") works anywhere. Bowing ("lạy Phật") only in front of the
  statues or while seated on a cushion.
- D6. Prayer beads: a 108-bead round; show the bead within the round and
  the total ever counted. The total is saved on this device and kept
  across visits.
- D7. Beads can be counted anywhere, standing or seated; walking puts the
  beads away.
- D8. Sweeping: leaves fall slowly onto the yard; walking over them while
  holding the broom removes them. No score or leaf counter.
- D9. The broom leans in a corner of the yard. Near it, the prompt picks
  it up; near the same spot again, it puts it back. You can walk while
  holding it.
- D10. Sitting is only sitting: cross-legged pose, camera can still be
  dragged, any movement key stands up. No timer, no auto-moktak.

## Scope
**In**
- Interaction prompts: when the avatar is within reach of a target (a
  cushion, the statue area, the broom spot), show one prompt with the key
  and a tappable button. Only the nearest available target is offered.
- Sit: snap the avatar onto the nearest free cushion, facing the altar
  (cushions in the hall and the four banyan seats, `MEDITATION_SEATS`).
  Movement input stands up.
- Greeting: palms joined in front of the chest for a short hold, then
  back to idle. Available whenever standing still or seated.
- Bow: kneel-and-bow (seated: bow forward from the seated pose). Only
  in the statue zone in front of the altar or while seated.
- Prayer beads: a key/button turns one bead; on-screen counter
  "hạt N/108 · tổng T". The total is stored in `localStorage` (wrapped so
  a failure does not break the scene). Movement hides the beads.
- Broom and leaves: a broom model (procedural) at a fixed yard corner;
  leaves spawn slowly at random yard positions up to a cap; a held broom
  sweeps leaves within a small radius of the avatar while walking; a
  sweeping arm motion plays while moving with the broom.
- Vietnamese text for every new prompt and label, in the existing i18n.
- The action state (idle / walking / seated / greeting / bowing / beads /
  holding broom) lives in one pure, unit-tested state machine, so Milestone
  6 can send it to the server unchanged.

**Out**
- Showing other visitors or sending actions to the server (Milestone 6).
- Incense offering and its queue.
- Meditation timer, automatic moktak, music.
- Leaf score or counter; leaves outside the yard wall.
- New third-party models or animations (none provided yet).

## Acceptance criteria
1. Near a free cushion the prompt "Ngồi thiền" appears; using it seats the
   avatar on that cushion facing the altar; W/A/S/D stands it up.
2. "Chắp tay" works standing still or seated and returns to the previous
   pose afterwards.
3. "Lạy Phật" is offered only in the statue zone or while seated, and not
   elsewhere.
4. Each bead press adds one: the round goes 1..108 then restarts at 1, the
   total keeps growing, and the total survives a page reload.
5. Near the broom spot the prompt offers "Cầm chổi" / "Dựng chổi"; with the
   broom held, leaves the avatar walks over disappear; without it, they do
   not.
6. Every prompt has a tappable button that does the same as its key;
   checked at 375 px and 1440 px.
7. Unit tests cover the action state machine, target selection, bead
   counting and leaf sweeping; `npm test` and `tsc` pass.
8. Frame rate is not noticeably worse than before (leaves are instanced,
   one draw call).

## Open for the design phase (not owner questions)
- Exact keys (proposal: E = context action, Q = greeting, B = bead).
- Reach distances, the statue-zone rectangle, broom corner position, leaf
  cap and spawn rate.
- How seated/bow poses look on monk.glb's short-legged rig.
