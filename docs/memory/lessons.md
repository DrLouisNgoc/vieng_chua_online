# Lessons

Gotchas learned the hard way. Grep for your topic; add one line when you learn a new one.
Full original wording: `archive/handoff-2026-11-10.md` ("Gotchas learned").

## 3D, models, avatar
- GLTFLoader strips "." from node names: bone "thigh.L" is "thighL".
- Animate bones as an offset from the rest quaternion; never overwrite it.
- monk.glb faces opposite the +Z heading convention (add PI).
- monk.glb bone axes (avatar frame, Euler YXZ): x>0 swings a limb forward / bends the elbow forward; spine x<0
  bends forward; left arm z>0 moves inward, y<0 swings a forward forearm inward. Probe one axis at a time with
  screenshots before tuning a pose.
- Other visitors are cloned (SkeletonUtils) from an unposed copy of monk.glb taken before the own avatar is posed.
- In `buildTempleGrounds`, builders are function declarations called before `return`; a `const` they use must be
  declared above that call or at module level (temporal dead zone at runtime).
- Count triangles per mesh before guessing at render cost: one model (pine.glb) was 95% of the scene.
- A small object's self-shadow on the 90-unit sun shadow map reads as flat black: set `castShadow = false` on
  its own roof, keep `receiveShadow`.
- The start position is in front of the hall stairs, facing the hall. `?gio=HH` previews any hour.

## Browser and DOM
- Use `KeyboardEvent.code`, not `key` (Vietnamese IMEs rewrite `key`).
- CSS `display` on an element overrides the `hidden` attribute.
- Browsers block autoplay with sound; start muted and unmute on a real click (background music does this).
- TypeScript does not carry a null-guard's narrowing into a nested `function` declaration; re-bind to a typed
  `const` first.
- A discriminated union needs one literal discriminant per member for narrowing by elimination
  (`ReadQuestionsResult` in boards.ts).

## Server, proxy, deploy
- Behind Caddy, `request.socket.remoteAddress` is Caddy's own address; the real visitor ip is the first entry
  of `X-Forwarded-For` (`server/src/clientIp.ts`, used for every per-ip rule). Local dev has no proxy, so a bug here only shows live.
- Server tests share one loopback address: `connect()` in server.test.ts sends a fake `X-Forwarded-For` per call.
- `new WebSocketServer({ server })`: ws does not close the HTTP server on `wss.close()`, and both `httpServer`
  and `wss` need their own `'error'` listener or `EADDRINUSE` crashes the process.
- The app reads two build-time URLs, `VITE_PRESENCE_URL` and `VITE_BOARDS_URL`; Caddy needs `handle` blocks for
  `/ws*`, `/boards*`, `/admin*`. Missing either looks like "Không tìm thấy." on every board.
- Never treat an unreadable data file as "fresh install": `server/data/*.json` once fell back to seeds on a
  parse error, which would have overwritten real content and the admin hash. Missing → seed; corrupt → fail
  loudly. Write via temp file + rename, since every deploy restarts the server.
- An ambient `PORT` env var can push the server off 8787; `scripts/dev.mjs` pins it for the server child only.
- Anything done with `GITHUB_TOKEN` (the CI automerge) starts no push workflows and skips GitHub's
  "Closes #n" auto-close: `automerge` dispatches the deploy and closes linked issues itself.
- CI's SSH session has no terminal for `sudo`: the VPS has a NOPASSWD rule for exactly
  `systemctl restart chua-server` (`/etc/sudoers.d/chua-deploy`).

## Tooling on the owner's Windows machine
- The Bash tool's `python` can hang (Store stub); use `node`.
- Screenshots: headless Chromium times out with shadows on; drive system Chrome with the GPU via Playwright
  (`channel: 'chrome'`, `--use-angle=d3d11`), Playwright kept in the scratchpad, not the repo.
- Headed Chrome is rAF-throttled when its window is covered: pass `--disable-backgrounding-occluded-windows`,
  `--disable-renderer-backgrounding`, `--disable-background-timer-throttling`. For timing, render 60 frames
  synchronously via a temporary `window.__perf` hook; never commit such hooks (`window.__verify` either).
