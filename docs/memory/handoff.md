# Handoff

Current state only, ≤ 5 KB. Per-task status lives in GitHub Issues and PRs.
History: `archive/handoff-2026-11-10.md`, `archive/log-to-2026-11-10.md`, git log.

## State (2026-11-10)
- Live and public at `https://chua.io.vn` (decision 0011). Milestones 1–10 done: 3D procedural temple,
  onboarding with pháp danh locked per ip, movement/interactions/practice, other visitors live, 8 cốc boards
  + hall projector + quote plaque, hỏi pháp with public answers, public chat, bell on join and hourly,
  background music.
- Two owners, two machines, one repo (decision 0012): Issues → branch → PR → CI green → auto-merge → deploy.
- Tests: server 139, app 254; `npm run check` green.

## Passwords and data (live)
- Admin password and each cốc password: the first submit sets it. Reset = clear `adminPasswordHash` (or a board's
  `passwordHash`) in `server/data/boards.json` on the VPS, restart, set it again at once.
- `server/data/` (boards, pháp danh locks) exists only on the VPS: back it up; never in git.

## Open work (to move into GitHub Issues)
- Bug, likely: the 8-connections-per-ip cap counts Caddy's address, so the whole site may share one cap
  (`server/src/server.ts`, `const ip = request.socket.remoteAddress`). Use `clientIp()`; test first.
- Tech debt, in order: Prettier; ESLint + knip report; `strict` in app tsconfig; protocol into `shared/`; split
  `temple-grounds.ts`, `boards-panel.ts`, `scene.ts`, `style.css`; one JSON-route helper in `boardsHttp.ts`.
- `deploy.sh` hardening on the VPS (build to a temp dir, health check, rollback): guide file 11, owner applies.
- Owner assets: `bell-gong.mp3` and 3 CC0 sounds (`docs/assets/third-party-assets.md`); quote photos in
  `app/public/thirdparty/phap-cu/`; confirm `nguyen-tue.jpg` is on the VPS.
- Owner answers pending: yard-size rulings (Milestone 4 status.md); Tâm Kinh proofreading
  (`app/src/chant-texts.ts`).
- Frame rate ~22–40 fps, noisy; next suspects: light count, MSAA, pixel ratio. Measure on an idle machine.

## Constraints
- No DRM bypass; only publicly fetchable assets. Never monetise.
- Deployed by merge; VPS, secrets, repo settings and `server/data/` are red tier (CLAUDE.md).
