# Handoff

Current state only, ≤ 5 KB. Per-task status lives in GitHub Issues and PRs.
History: `archive/handoff-2026-11-10.md`, `archive/log-to-2026-11-10.md`, git log.

## State (2026-11-13)
- Live and public at `https://chua.io.vn` (decision 0011). Milestones 1–10 done: 3D procedural temple,
  onboarding with pháp danh locked per ip, movement/interactions/practice, other visitors live, 8 cốc boards
  + hall projector + quote plaque, hỏi pháp with public answers, public chat, bell on join and every 30 min
  (owner, 2026-11-13), background music.
- "Đọc Kinh Nikaya": the budsas.org iframe/link-list approach (blocked by `x-frame-options`) and the
  page-flip book UI from #47 are both superseded (#74) — the owner now drops a real PDF in
  (`app/public/thirdparty/kinh/trung-bo-kinh.pdf`, gitignored, scp'd to the VPS by hand, both
  `app/public/...` and `app/dist/...`) and `pdf-reader.ts` renders it page by page via `pdfjs-dist`.
- Cốc Sư Nguyên Tuệ (#76): its talks list can now mix YouTube bài giảng and PDF books in the same
  "Tên | link" field (`isPdfTalk`, told apart by the `.pdf` extension) — a library, not just videos. The
  owner's actual Thiền Sư Nguyên Tuệ files aren't uploaded yet, only the mechanism.
  A single open board now fills most of the screen (`boards__panel--full`) instead of a small corner box.
- Lanterns (#86): the red paper lanterns (path posts + hall pillars) now use a Blender-made model,
  `app/public/models/lantern.glb`, committed; rebuild with `scripts/blender/lantern.py`. If the file is missing the
  old plain ball is drawn. Blender 5.3 runs headless on the owner's machine (`lessons.md`), so other props can be
  made the same way.
- Two owners, two machines, one repo (decision 0012): Issues → branch → PR → CI green → CI merges itself → deploy; `main` not locked, one shared GitHub account, owner shown by label `ngoc`/`anh` (0014). No visual-check gate (0016): every green PR auto-merges, 3D/CSS changes included.
- Tests: server 159, app 307; `npm run check` green.

## Passwords and data (live)
- Admin password and each cốc password: the first submit sets it. Reset = clear `adminPasswordHash` (or a board's
  `passwordHash`) in `server/data/boards.json` on the VPS, restart, set it again at once.
- `server/data/` (boards, pháp danh locks) exists only on the VPS: back it up; never in git.

## Open work
All open work is a GitHub Issue: `gh issue list --state open`. Read the pinned one first.
- **Big refactor in progress: pinned Issue #25** (decision 0017; steps and what is left are in its body). Lint
  cleanup at 266 suppressions (2026-11-13), all in 5 files.
- Also open (2026-11-12): CSP header #56; owner assets #57; owner answers on hall/yard size #58 and Tâm Kinh
  proofreading #59; frame rate #60.

## Constraints
- No DRM bypass; only publicly fetchable assets. Never monetise.
- Deployed by merge; VPS, secrets, repo settings and `server/data/` are red tier (CLAUDE.md).
