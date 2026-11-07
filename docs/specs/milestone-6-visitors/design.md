# Milestone 6 design: other visitors visible

## Protocol (JSON text frames on the existing WebSocket)
Client -> server
| type | fields | when |
|---|---|---|
| `join` | `name` (1-24 chars after trim), `colorIndex` (0-4) | after "Vào chùa", and again after a reconnect |
| `state` | `x`, `z` (finite, within WORLD_LIMIT 300), `heading` (finite), `activity` (Milestone 5 enum), `seatIndex` (integer in seat range, or null), `holdingBroom`, `beadsVisible` (booleans), `beadTotal` (integer >= 0) | at most every 100 ms, only when changed (positions rounded to 0.01) |

Server -> client
| type | fields | when |
|---|---|---|
| `presence` | `count` | unchanged from Milestone 3 |
| `welcome` | `id` | reply to `join` |
| `visitors` | `visitors: VisitorView[]` (id, name, colorIndex + the state fields) | every 100 ms tick when anything changed, and right after a join |
| `seat-refused` | `seatIndex` | a `state` claimed a cushion another visitor holds |

Server rules: `ws` `maxPayload` 2 KB; messages that fail validation are
dropped (counted, not echoed); more than 30 messages in one second from a
socket drops the extras; a `state` before `join` is ignored. On a refused
seat the server keeps the visitor's previous state and stores them as
standing.

## Server modules (server/src)
| File | Responsibility |
|---|---|
| `protocol.ts` (pure) | Types + `parseClientMessage(raw): ClientMessage | null` with all checks above. |
| `visitorRoom.ts` (pure) | Joined visitors, `join`, `updateState` (returns `"ok" | "seat-refused" | "ignored"`), `leave`, `snapshot()`, `dirty` flag for the tick. Seat ownership lives here. |
| `server.ts` | Socket wiring, rate limit, 100 ms broadcast tick. Keeps `presenceRoom` for the count. |
An integration test starts the server on a random port and drives two `ws`
clients through join, state, seat refusal and leave.

## Client modules (app/src)
| File | Kind | Responsibility |
|---|---|---|
| `visitor-protocol.ts` | pure | Encode `join`/`state`; `parseServerMessage` validates incoming `welcome`/`visitors`/`seat-refused`/`presence`. `shouldSendState(prev, next, elapsed)` throttle. |
| `visitor-client.ts` | browser | Replaces presence.ts: one socket, reconnect (re-sends `join`), status for the header, callbacks for visitors / seat refusal. presence.ts tests carried over. |
| `avatar-rig.ts` | three | Extracted from scene.ts: rest quaternions + `rotateBone`/`applyPose` for any avatar instance (own and remote). |
| `avatar-look.ts` | three | `tintRobe(avatar, color)` (clones the robe mesh material, decision 0010) and `createNameLabel(text)` (canvas sprite). |
| `remote-visitors.ts` | three | Map id -> remote avatar: create from a template clone (SkeletonUtils, cloned before any posing), smoothing toward received position/heading, local walk clock, `poseForActivity`, props via the shared `placeHeldProps`, label text with bead total, remove on leave. |
| `held-props.ts` | three | `placeHeldProps` moved out of interaction-runtime so own and remote avatars place beads/broom the same way. |
| `interaction-runtime.ts` | change | Takes `occupiedSeats()`; exposes `snapshot` + bead total for sending; `forceStand()` on seat refusal. |
| `interaction-state.ts` | change | `standUp()` (seat refused): seated/beads-seated -> idle. |
| `scene.ts` / `main.ts` | change | `setIdentity(name, colorIndex)` on enter: tints own robe, client sends `join`. Scene sends state each frame through the throttle; renders remote visitors. |

Remote smoothing: position eases with `1 - exp(-12 dt)`; heading takes the
short way round. A remote counts as walking when its activity is
`walking`, which drives its own walk clock.

## Rulings
- Full visitor list each tick, not deltas (E1: <= 10 visitors, ~200 bytes
  each, 10 Hz = ~20 KB/s worst case on a LAN or small VPS).
- Seat claims ride on `state` (no separate request message): the client
  already hides taken cushions, so a refusal only happens on a true race.
- Name labels are sprites always facing the camera, hidden beyond 40 units.
- Bead total text: "Tên · 1.080 hạt" while beads are visible.

## Tests
Server: protocol validation table (every field, bad JSON, wrong types,
out of range, extra-long name, unknown type), room (join/leave, seat claim,
refusal, release on stand/leave, dirty flag), integration (two clients).
Client: visitor-protocol parse/encode/throttle, interaction-state
`standUp`, runtime occupied seats via prompts (pure parts), remote smoothing
maths (pure helper), label text.
