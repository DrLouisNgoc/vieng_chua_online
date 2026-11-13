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
- Blender-made look (owner, 2026-11-13; scripts in `scripts/blender/`, headless Blender 5.3, see `lessons.md`; each model
  is committed in `app/public/models/` and the old procedural mesh is the fallback if a file is missing):
  lanterns (#86); a Shwedagon-style pagoda complex east of the wall (#88, wall + gate + hollow chánh điện #96/#104, a
  copy of the temple's own Buddha on its altar via `statue-copy.ts`); the 8 cốc and the meditation hut (#89, #92); the
  main hall's roof (#94), walls and pillars, and the perimeter wall (#108); every visitor's avatar, our own Nam tông
  novice with its own rig (#98, `monk.glb` is the fallback, robe colour index 0 saffron).
- Gate and bell (#118): the main gate and the bell pavilion are Nam tông Blender models (`gate.glb`, `bell-tower.glb`, `gate_bell.py`); old meshes are the fallback.
- Land (#114): the walkable land is `WALK_AREA` (terrain-layout.ts, x -160..300, z -160..200; the walk ends at its edge) with a green ground; beyond it `terrain.glb` (scripts/blender/terrain.py) fills the rest: foothills with a pine forest, a river ring, sharp snow-capped mountains to the horizon, two huge waterfalls on the north range and five streams (animated by `waterfall.ts`; ~205k triangles, 3.1 MB).
- Clouds (#124): `clouds.ts`, ~130 soft sprites drifting round the mountains (fainter at night).
- East gate (#102): a gate in the east wall (`EAST_GATE`) and a stone way lead to the pagoda complex, which is
  walkable (`pagoda-layout.ts`: colliders, plaza and hall floor heights, lamps). The camera does not collide with it.
- Two owners, two machines, one repo (decision 0012): Issues → branch → PR → CI green → CI merges itself → deploy; `main` not locked, one shared GitHub account, owner shown by label `ngoc`/`anh` (0014). No visual-check gate (0016): every green PR auto-merges, 3D/CSS changes included.
- Tests: server 159, app 378; `npm run check` green.

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
