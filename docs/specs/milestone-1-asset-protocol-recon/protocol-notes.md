# Protocol notes (from static recon of game-YRnjQJx2.js)

Source: same bundle as asset-manifest.md, specifically the client's
`k2` realtime-connection class (around line 4039 of the minified file).
These are **inferred from reading the client's own code**, not from
capturing real traffic (observation was blocked by a persistent
"연결이 지연되고 있어요" / reconnecting state during this session — see
Known gaps). Field names below are my best reading of the minifier's
variable names next to each message; treat anything not explicitly quoted
in the bundle as inferred, not confirmed.

## Real endpoint (sansatemple.com's own — never connect to this from our app)
```
wss://sansa-realtime.wlsdnjs0529.workers.dev/presence
```
This confirms decision 0004: it's a small Cloudflare Workers-based realtime
service, not a heavyweight game server. That's good news for building an
owner-run equivalent — this is a small, buildable scope (presence + a
handful of per-visitor actions), not a full game-server reimplementation.

## Connection flow (inferred)
1. Client opens a WebSocket to the room endpoint, with `room`, `instance`,
   `region` as URL search params (matches the page URL pattern
   `?room=maru-10&instance=5&region=apac` observed live). Room names must
   match `/^maru(?:-\d{2,3})?$/`; instance is an integer `0–15`.
   `region` is validated against a small allow-list (values not fully
   enumerated here — `apac` confirmed live).
2. A `visitToken` (UUID-looking, `/^[0-9a-f-]{36}$/i`) is saved in
   `sessionStorage` per visit and resent on reconnect to resume the same
   seat/session, guarded by a Web Locks `navigator.locks` tab-lock
   (`claiming`/`claimedToken`) so only one tab per token drives the
   connection.
3. Server replies with a message carrying `version`, `url`, `room`,
   `token`, `instance`, `region` — the client validates these against its
   own state before accepting a reconnect/room-switch.
4. Ongoing sync uses `revision` (an incrementing counter) and `delta`
   messages with `removed` and `upserts` arrays — a diff-sync pattern:
   server sends full `visitors` array on `hello`/`sync`, then incremental
   `delta` updates after. Client periodically sends `{type:"ack",
   revision}` to acknowledge, batched by byte size (`ackBytes >= 64KB`) or a
   5s timer.
5. `sync` is requested by the client (`{type:"sync"}`) when it suspects it
   missed updates (e.g. after a binary-decode failure); server is expected
   to answer with a fresh full snapshot within 8s or the client treats the
   connection as dead and closes it (code 1011).
6. Idle/heartbeat: a `pongTimer` closes the socket after ~20s without a pong
   inside a ~60s outer window — i.e. the server is expected to ping and the
   client to pong-timeout-detect.

## Per-visitor state (from `visitors` array validation + `Qf`/snapshot code)
Each visitor entry includes at least:
- `id` — visitor session id
- position/orientation: `x`, `z`, `yaw`, `pose` (sent by the client on
  `move`)
- `beads: { visible, total, returnMode }` — prayer-bead counter state
- (room/instance/region are connection-level, not per-visitor)

## Message types seen (client → server unless noted)
| type | Purpose (inferred) |
|---|---|
| `hello` | Initial handshake after connecting (server → client, full state) |
| `sync` | Client asks for a fresh full snapshot |
| `delta` | Server → client incremental state update (`revision`, `removed`, `upserts`) |
| `ack` | Client acknowledges a `revision` it has applied |
| `move` | Client reports its own `{x, z, yaw, pose}` |
| `stand` / `seat` | Visitor stands up / sits down (the "resting on a cushion" mechanic — 방석) |
| `bow` | 절하기 / 합장 인사 (bowing / palms-together greeting) action |
| `bead` | 염주 (prayer bead) interaction — one bead "turned" |
| `incense` | 향 올리기 (offering incense) action |
| `incense-join` | Join the incense-offering queue (visible queue, "차례를 기다립니다" = waiting your turn) |
| `incense-start` | Server grants this visitor their turn at the incense burner |
| `room-switch` | Client requests moving to a different room/instance |

Note: `목탁` (moktak/wooden gong) striking does **not** appear to be a
server message — moktak UI strings reference local playback/"자동재생"
(autoplay) and audio-loading errors only, with no `type:"moktak"` found.
It looks like a **client-local** interaction (sound + animation only, no
server round-trip) — which makes it the cheapest candidate for the MVP's
"at least one original interaction" requirement.

## Recommendation for the MVP interaction
**목탁 (striking the wooden gong)** — because:
- It's client-local (no server protocol to reverse-engineer/reimplement for
  the interaction itself — only presence/`move`/`hello`/`delta`/`ack` are
  needed from the owner's server, which are needed anyway for the player
  count requirement).
- Its asset is already fully identified: `/assets/moktak-*.webp` (sprite)
  and `./audio/moktak-hit-natural.wav` (sound), both in the manifest.
- Its full Korean string set was captured (목탁 두드리기, 목탁 자동재생,
  일시정지, etc.) — straightforward to translate.

`염주` (beads) and `절하기`/`합장` (bow) both need a real server round-trip
(`bead`, `bow` message types) and are reasonable next picks once the
presence/sync loop itself works. `향 올리기` (incense) is the most complex
(queue + turn-taking) — leave for later.

## Known gaps (not resolved by this static pass)
- Exact JSON/binary wire shape of each message (field names/order, whether
  `delta`/`sync` payloads are JSON or a packed binary format — the code
  references `R2.decode`/`TextEncoder` suggesting a possible compact binary
  encoding for some messages, text JSON for others; not fully disambiguated).
- The region allow-list's full value set (only `apac` confirmed).
- Real request/response timing and exact `hello` payload shape — needs a
  live WebSocket capture, which this session couldn't get cleanly (the live
  site stayed in "연결이 지연되고 있어요" / reconnecting during the
  automated browser session, never reaching a stable connected state within
  the observation windows used).
- This is sufficient to *design* an owner-run server's message shapes from
  scratch (we're not bound to match the original wire format exactly, since
  we're not talking to their server) — exact-format gaps mostly matter if a
  future goal is interoperating with the original service, which decision
  0004 already rules out.
