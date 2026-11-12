# Handoff

Current state only, ≤ 5 KB. Per-task status lives in GitHub Issues and PRs.
History: `archive/handoff-2026-11-10.md`, `archive/log-to-2026-11-10.md`, git log.

## State (2026-11-10)
- Live and public at `https://chua.io.vn` (decision 0011). Milestones 1–10 done: 3D procedural temple,
  onboarding with pháp danh locked per ip, movement/interactions/practice, other visitors live, 8 cốc boards
  + hall projector + quote plaque, hỏi pháp with public answers, public chat, bell on join and hourly,
  background music, "Đọc Kinh Nikaya" board (a title + link to budsas.org, one per day via `sutraOfTheDay()`;
  links only, never the copyrighted translation; starts empty, the owner fills it in) now shown as a book —
  each sutra link is a "page" (`.boards__page`) with a page-turn flip animation and Trang trước/sau nav
  (owner, 2026-11-11: "lướt sang trang như đọc 1 quyển sách thật"); content is still only the budsas.org
  iframe, never copied in.
- Shipped in #47 (ngoc): the sutra reader's page-flip book UI above (`boards-panel.ts` `buildSutraPage`/
  `buildSutraPageNav`, `boards-client.ts` `turnSutraPage`/`sutraFlipDirection`).
- Two owners, two machines, one repo (decision 0012): Issues → branch → PR → CI green → CI merges itself → deploy; `main` not locked, one shared GitHub account, owner shown by label `ngoc`/`anh` (0014). No visual-check gate (0016): every green PR auto-merges, 3D/CSS changes included.
- Tests: server 159, app 282; `npm run check` green.

## Passwords and data (live)
- Admin password and each cốc password: the first submit sets it. Reset = clear `adminPasswordHash` (or a board's
  `passwordHash`) in `server/data/boards.json` on the VPS, restart, set it again at once.
- `server/data/` (boards, pháp danh locks) exists only on the VPS: back it up; never in git.

## Open work
All open work is a GitHub Issue: `gh issue list --state open`. Read the pinned one first.
- **Big refactor in progress: pinned Issue #25** (decision 0017; steps and what is left are in its body). Lint
  cleanup at 294 suppressions (2026-11-12), all in 5 files.
- Also open (2026-11-12): CSP header #56; owner assets #57; owner answers on hall/yard size #58 and Tâm Kinh
  proofreading #59; frame rate #60.

## Constraints
- No DRM bypass; only publicly fetchable assets. Never monetise.
- Deployed by merge; VPS, secrets, repo settings and `server/data/` are red tier (CLAUDE.md).
