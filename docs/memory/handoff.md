# Handoff

Current state only, ≤ 5 KB. Per-task status lives in GitHub Issues and PRs.
History: `archive/handoff-2026-11-10.md`, `archive/log-to-2026-11-10.md`, git log.

## State (2026-11-10)
- Live and public at `https://chua.io.vn` (decision 0011). Milestones 1–10 done: 3D procedural temple,
  onboarding with pháp danh locked per ip, movement/interactions/practice, other visitors live, 8 cốc boards
  + hall projector + quote plaque, hỏi pháp with public answers, public chat, bell on join and hourly,
  background music, "Đọc Kinh Nikaya" board (a title + link to budsas.org, one per day via `sutraOfTheDay()`;
  links only, never the copyrighted translation; starts empty, the owner fills it in).
- Two owners, two machines, one repo (decision 0012): Issues → branch → PR → CI green → CI merges itself → deploy; `main` not locked, one shared GitHub account, owner shown by label `ngoc`/`anh` (0014).
- Tests: server 152, app 258; `npm run check` green.

## Passwords and data (live)
- Admin password and each cốc password: the first submit sets it. Reset = clear `adminPasswordHash` (or a board's
  `passwordHash`) in `server/data/boards.json` on the VPS, restart, set it again at once.
- `server/data/` (boards, pháp danh locks) exists only on the VPS: back it up; never in git.

## Open work (to move into GitHub Issues)
- Tech debt, in order (done: boardsHttp helper, Prettier config): run `npm run format` once and add
  `format:check` to CI; `strict` in app tsconfig; protocol constants into `shared/`; split `temple-grounds.ts`,
  `boards-panel.ts`, `scene.ts`, `style.css`, `main.ts` (`npm run check:size` lists them); then `check-size
  --strict` in CI. Wait for branch `ngoc/chanh-dien-kinh-nikaya` (edits those app files) to merge first.
  ESLint/knip dropped: typescript-eslint supports TS < 6.1 (we use 7); knip needs a prebuilt native parser.
- Owner applies on the VPS: new `deploy.sh` (guide 11), systemd unit with `ALLOWED_ORIGIN` + hardening (guide 08,
  check `systemctl show chua-server -p Environment`), Caddy headers/compression (guide 09). Then run the Backup
  workflow once by hand.
- Not done yet: a Content-Security-Policy header (needs testing against the YouTube embeds and inline styles).
- Owner assets: `bell-gong.mp3` and 3 CC0 sounds (`docs/assets/third-party-assets.md`); quote photos in
  `app/public/thirdparty/phap-cu/`; confirm `nguyen-tue.jpg` is on the VPS.
- Owner answers pending: yard-size rulings (Milestone 4 status.md); Tâm Kinh proofreading
  (`app/src/chant-texts.ts`).
- Frame rate ~22–40 fps, noisy; next suspects: light count, MSAA, pixel ratio. Measure on an idle machine.

## Constraints
- No DRM bypass; only publicly fetchable assets. Never monetise.
- Deployed by merge; VPS, secrets, repo settings and `server/data/` are red tier (CLAUDE.md).
