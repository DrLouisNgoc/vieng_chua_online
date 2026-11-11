# Handoff

Current state only, ≤ 5 KB. Per-task status lives in GitHub Issues and PRs.
History: `archive/handoff-2026-11-10.md`, `archive/log-to-2026-11-10.md`, git log.

## State (2026-11-10)
- Live and public at `https://chua.io.vn` (decision 0011). Milestones 1–10 done: 3D procedural temple,
  onboarding with pháp danh locked per ip, movement/interactions/practice, other visitors live, 8 cốc boards
  + hall projector + quote plaque, hỏi pháp with public answers, public chat, bell on join and hourly,
  background music, "Đọc Kinh Nikaya" board (a title + link to budsas.org, one per day via `sutraOfTheDay()`;
  links only, never the copyrighted translation; starts empty, the owner fills it in).
- This PR (ngoc): chánh điện brighter across 4 passes (9-lamp ceiling grid, `buildHallAmbientLights`); chánh
  điện plaque cycles short own-words lines (`setPhapCuText`, not a copy of any Pháp Cú translation) plus two
  static entrance quote tiles (`buildWallPlaque`); a plain "Phòng Đọc Kinh Nikaya" sign at the meditation hut's
  door; the sutra board reads its link inline in an iframe instead of a new tab.
- Two owners, two machines, one repo (decision 0012): Issues → branch → PR → CI green → CI merges itself → deploy; `main` not locked, one shared GitHub account, owner shown by label `ngoc`/`anh` (0014). No visual-check gate (0016): every green PR auto-merges, 3D/CSS changes included.
- Tests: server 152, app 258; `npm run check` green.

## Passwords and data (live)
- Admin password and each cốc password: the first submit sets it. Reset = clear `adminPasswordHash` (or a board's
  `passwordHash`) in `server/data/boards.json` on the VPS, restart, set it again at once.
- `server/data/` (boards, pháp danh locks) exists only on the VPS: back it up; never in git.

## Open work (to move into GitHub Issues)
- **Big refactor in progress (pinned Issue #25, decision 0017).** Done: whole-repo Prettier, strict standard and
  all tooling, server files in kebab-case. Next: clear `eslint-suppressions.json` area by area (885 left; server small modules, scripts/, shared/ done),
  then delete it, set `IS_RETIRED` in `scripts/check-suppressions.mjs`, enable oxlint type-aware + more
  categories, make knip blocking; split `temple-grounds.ts`, `style.css`, `boards-panel.ts`, `scene.ts`,
  `main.ts`; then `check-size --strict` in CI.
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
