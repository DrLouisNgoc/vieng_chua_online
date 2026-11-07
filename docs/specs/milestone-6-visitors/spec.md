# Milestone 6: other visitors visible

PRD: docs/product/vieng-chua-online.prd.md (Milestone 6)
Interview with the owner: 2026-11-07, one round. Builds on Milestone 5's
interaction snapshot (docs/specs/milestone-5-interactions/).

## Goal
Visitors in the temple at the same time see each other: where they walk,
how they sit, greet, bow, count beads and sweep, with their name above
their head and their own robe colour.

## Decisions from the interview (owner, 2026-11-07)
- E1. Up to about 10 visitors at once (family/friends; decision 0001
  still applies). A simple full-state broadcast is enough.
- E2. Others show: Dharma name above the head, robe colour on the 3D
  avatar (decision 0010), beads and broom while held.
- E3. Leaves and the broom stay per-visitor (each visitor has their own
  yard); others only see you holding a broom and sweeping.
- E4. A cushion someone sits on cannot be taken by another visitor.

## Scope
**In**
- Server: visitors join with name + robe colour, send their state
  (position, heading, Milestone 5 snapshot, bead total); the server
  validates every message, keeps the room, and broadcasts all visitors'
  states ~10 times a second when something changed; leaving or
  disconnecting removes the visitor. Presence count unchanged.
- Server owns cushion occupancy: a sit on a taken cushion is refused and
  the refused client stands up.
- Client: one avatar per other visitor (cloned monk.glb, tinted robe,
  name label), smoothly following received positions, posed with the same
  pose code as your own avatar, with their beads/broom shown.
- Your own avatar is tinted with your robe colour.
- Occupied cushions are not offered to you ("Ngồi thiền" hidden).
- Bead total shown next to a visitor's name while they count beads
  (original sansatemple `beads { visible, total }`).

**Out**
- Shared leaves or broom (E3), chat, voice, incense, accounts or login,
  access control (Milestone 7 deploy), more than ~10 visitors.
- Gender on the 3D avatar (no 3D variant exists).

## Acceptance criteria
1. Two browser windows: each sees the other avatar with the right name and
   robe colour; walking in one moves it in the other within ~0.3 s.
2. Sitting, greeting, bowing, beads and holding the broom in one window
   show in the other (beads total next to the name while counting).
3. A cushion taken in window A is not offered in window B; a forced
   simultaneous sit is refused by the server and B stands up.
4. Closing a window removes its avatar from the other within ~2 s.
5. The server rejects malformed or out-of-range messages without
   crashing (unit tests), and caps message size.
6. `npm test` + `tsc` pass in app/ and server/; screenshots 375/1440.
7. Render timing with one remote visitor is not noticeably worse.
