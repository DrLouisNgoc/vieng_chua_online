# Milestone 5 plan

Design: design.md. One branch `build/milestone-5-interactions`; one commit
per step; strict TDD (failing test first) for every pure module. After each
step: `npm test`, `tsc --noEmit`. UI steps also: screenshots 375/1440.

| # | Step | Test first | Done when |
|---|---|---|---|
| 1 | **Pose spike.** `body-pose.ts` with `BodyPose`, `walkPose`, `blendPose`, SEATED, BOW_SEATED, BOW_STANDING, GREET. Generalise `swingBone` to 3 axes, apply the whole pose in parent-before-child order; walking uses `walkPose`. Temporary debug key cycles poses (removed before commit). | walkPose == old computeWalkPose; blend endpoints/midpoint; poses name only real bones | Screenshots of each pose shown to the owner; walk unchanged |
| 2 | `movement.placeAt` | snaps, stops walking | tests pass |
| 3 | `interaction-state.ts` | every transition + refusals + timers (design table) | tests pass |
| 4 | Layout constants + `interaction-targets.ts` | nearest free seat, occupied skipped, reach, statue zone edges, broom spot | tests pass |
| 5 | `interaction-prompts.ts` + INTERACTION_TEXT | E priority, no Q/B while walking, broom rules | tests pass |
| 6 | Wire sit / greet / bow into scene.ts (keys E/Q), pose blending, seat snap and facing | — (browser) | Sit on a hall cushion and a banyan seat, greet, bow; screenshots |
| 7 | `interaction-hud.ts` prompt bar + CSS | prompt list → buttons (DOM test with a stub element, or kept trivial) | Buttons work like keys at 375/1440 |
| 8 | `bead-counter.ts` + B key + bead chip + bead string mesh | wrap 108→1, total, storage load/save/throw | Total survives reload |
| 9 | `leaf-field.ts` | cap, spawn radius, sweep, seeded random | tests pass |
| 10 | Broom mesh, take/leave at BROOM_SPOT, held in hand.R, sweep pose while walking, leaves InstancedMesh + sweep | — (browser) | Leaves vanish under the broom only; screenshots |
| 11 | Check all 8 acceptance criteria; render timing before/after (two runs each); update status, handoff, for-owner summary | — | Report with evidence |

Risks: step 1 may show cross-legged is not reachable on the short legs →
fall back to kneeling-seated (seiza) and tell the owner. Step 6 seat height
on the raised hall floor uses `groundHeightAt` + `hipsDrop`.
