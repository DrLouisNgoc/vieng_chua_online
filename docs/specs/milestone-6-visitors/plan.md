# Milestone 6 plan

Branch `milestone-6-visitors`, one commit per step, TDD for pure modules.

| # | Step | Done when |
|---|---|---|
| 1 | server `protocol.ts` (validation) | tests pass |
| 2 | server `visitorRoom.ts` (state, seats, dirty) | tests pass |
| 3 | server `server.ts` wiring + rate limit + tick; integration test with two ws clients | tests pass |
| 4 | app `visitor-protocol.ts` (parse, encode, throttle) | tests pass |
| 5 | app `visitor-client.ts` replacing presence.ts (keep header count) | tests pass, header still shows count |
| 6 | app `avatar-rig.ts` extraction; own avatar unchanged | tests pass, walk/sit screenshots unchanged |
| 7 | `avatar-look.ts` robe tint + name label; own robe tinted on enter | screenshot |
| 8 | `held-props.ts`, `remote-visitors.ts`, `standUp`, occupied seats, seat refusal | tests pass |
| 9 | Wire into scene/main; two-window browser check of criteria 1-4 at 1440 and 375; render timing | evidence in status.md |
| 10 | Docs: status, handoff, log, PRD, for-owner summary; merge | done |
