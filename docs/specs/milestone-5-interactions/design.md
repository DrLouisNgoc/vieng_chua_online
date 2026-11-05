# Milestone 5 design: in-temple interactions

Spec: spec.md (decisions D1-D10). Everything new is pure and unit-tested
except the thin wiring in scene.ts and the HUD DOM.

## Rig facts (read from monk.glb, 2026-11-05)
Bones: hips, spine, chest, neck, head, upper_arm.L/R, forearm.L/R,
hand.L/R, thigh.L/R, shin.L/R, foot.L/R (GLTFLoader drops the "."). A full
humanoid chain, so seated, bowing, palms-joined and sweeping poses are all
reachable with bone rotations. Risk: the legs are short and stubby;
cross-legged may need a hip drop plus thigh splay rather than a true lotus.
Build step 1 is a pose spike to check this before the rest is built on it.

## Modules (app/src)
| File | Kind | Responsibility |
|---|---|---|
| `body-pose.ts` | pure | `BodyPose` = per-bone rotation offsets `{x?, y?, z?}` in the avatar's frame (x = side axis, y = up, z = forward) for any of the 17 bones, plus `hipsDrop` (vertical offset of the whole avatar). Named poses: IDLE, SEATED, GREET, BOW_STANDING, BOW_SEATED, BEADS, BEADS_SEATED, BROOM_IDLE, and `sweepPose(t)`. `walkPose(t)` replaces `computeWalkPose` (same numbers). `blendPose(a, b, k)` for 0.25 s transitions. |
| `interaction-state.ts` | pure | The action state machine (below). Serializable snapshot for Milestone 6. |
| `interaction-targets.ts` | pure | From avatar position + state: nearest free seat within reach, broom spot within reach, inside statue zone or not. |
| `interaction-prompts.ts` | pure | From state + targets: the list of offered actions `{action, key, label}` shown in the HUD. |
| `bead-counter.ts` | pure | `{round 1..108, total}`; `turn()`; load/save through an injected storage adapter that swallows-and-warns on failure. |
| `leaf-field.ts` | pure | Leaves as points; `update(dt, random)` spawns up to the cap; `sweep(point, radius)` removes leaves in reach and returns how many. |
| `interaction-hud.ts` | DOM | Prompt bar (one button per offered action, label + key cap) and bead chip "hạt N/108 · tổng T". Buttons call the same `perform(action)` as the keys. |
| `broom-mesh.ts`, leaves render | three.js | Procedural broom (handle + straw head). Leaves: one `InstancedMesh` (small flat quads, no shadow casting), synced from `leaf-field`. |
| `temple-layout.ts` | data | New constants: `BROOM_SPOT`, `STATUE_ZONE`, `LEAF_SOURCES`, reach distances. |
| `movement.ts` | change | Add `placeAt(point)` (snap onto a cushion; clears any target). |
| `scene.ts` | wiring | Keys E/Q/B, per-frame: state tick, targets, pose apply, leaves, broom parenting. Exposes `interactions` on `TempleScene` for main.ts/HUD. |

`swingBone` in scene.ts generalises to rotate about any of the three avatar
axes (same parent-frame trick that is already there), applied in a fixed
parent-before-child order so children use their parent's new pose.

## State machine (`interaction-state.ts`)
```
activity: idle | walking | seated(seatIndex) | greeting | bowing | beads
holdingBroom: boolean        // orthogonal to activity
returnTo: idle | seated(i)   // where greeting/bowing go back to
```
| Event | From | To |
|---|---|---|
| move input | any (seated → stand first) | walking; beads put away |
| stop input | walking | idle |
| `sit(i)` (E near free seat) | idle, beads | seated(i); broom must not be held (prompt not offered while holding) |
| `greet` (Q) | idle, seated, beads | greeting for 1.5 s, then returnTo |
| `bow` (E in statue zone, or E while seated) | idle, seated | bowing for 2.4 s, then returnTo |
| `bead` (B) | idle, seated, beads | beads (seated keeps seat); counter +1 |
| `takeBroom` / `leaveBroom` (E near broom spot) | idle, walking stopped | holdingBroom toggles |
| `tick(dt)` | greeting, bowing | timers run down |

Not allowed (prompt hidden, event ignored): greeting/bowing/beads while
walking; bowing outside the zone unless seated; sitting with the broom.
Beads while holding the broom are not offered (both hands busy).

Snapshot `{ activity, seatIndex, holdingBroom, beads: { visible, total } }`
mirrors the original's per-visitor `pose` + `beads` fields
(milestone-1 protocol-notes.md), so Milestone 6 can send it as is.

## Keys and prompts
- E: context action, one at a time by priority: Dựng chổi / Cầm chổi (near
  the broom spot) > Lạy Phật (seated or in the statue zone) > Ngồi thiền
  (near a free seat).
- Q: Chắp tay. B: Lần hạt.
- Key handling on keydown, ignoring `event.repeat` and typing in inputs
  (same `isTypingInField` guard), by `KeyboardEvent.code`.
- The HUD bar sits above the hint line; at 375 px the buttons wrap and are
  at least 44 px tall.

## Rulings (recorded in status.md)
- Reach: seat 1.2, broom 1.5. Statue zone: x -12..12, z -45..-41.5 on the
  hall floor — the strip between the altar front (z -45) and the cushion
  row nearest the altar (z -41.8), so it never competes with a seat.
- Broom spot: x -7, z 24, beside the stone path just before the tree
  avenue (trees at x ±10 from z 30), 18 units from the start point.
- Leaves fall under trees, not uniformly over the yard: sources are the
  tree avenue (x ±10, z 30-105) and the banyan; spawn within radius 4 of a
  source, one leaf every 1.5 s, cap 120. The yard is 150 x 185 units, so
  uniform leaves would be too sparse to see.
- Sweep radius 1.0 around the avatar while walking with the broom.
- Seat facing: hall cushions face the altar (heading PI, toward -z);
  banyan seats face the trunk.
- Seats are all free in this milestone (no other visitors); the targets
  function already takes an `occupied` set for Milestone 6.
- New UI strings are Vietnamese literals in one `INTERACTION_TEXT` object
  in interaction-prompts.ts. The spec said "in the existing i18n", but that
  table is keyed by the original Korean strings and these actions' Korean
  strings were never captured (milestone-1 notes only name them).
- Bead total key in localStorage: `vieng-chua.beads.total`.

## Tests (TDD, written first)
- body-pose: `walkPose` equals the old `computeWalkPose` numbers;
  `blendPose` endpoints and midpoint; every named pose only names real
  bones.
- interaction-state: every row of the table above, including the refused
  transitions and timers returning to seated.
- interaction-targets: nearest free seat chosen, occupied seat skipped,
  out of reach → none, statue zone edges, broom spot.
- interaction-prompts: priority order for E; no Q/B while walking; no bead
  with broom; no sit with broom.
- bead-counter: 108 → 1 wrap, total grows, load/save, storage throwing.
- leaf-field: cap respected, spawns stay within source radius, sweep
  removes only leaves in reach, deterministic with a seeded random.
- movement: `placeAt` snaps and stops walking.
- Existing smoke test extended: grounds still build; a new scene-level
  check is browser-only (screenshots 375/1440 per acceptance criterion 6).

## Performance
Leaves: one instanced draw call, no shadow casting. Broom: 2 meshes. Bead
string: one small instanced mesh, shown only while counting. Expected cost
is negligible next to the ~415 existing draw calls; checked with the same
synchronous render timing as the pine fix.
