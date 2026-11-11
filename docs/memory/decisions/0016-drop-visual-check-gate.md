# Decision 0016: Drop the needs-visual-check merge gate

Date: 2026-11-11. Amends decision 0012's "except PRs labelled `needs-visual-check`" and decision 0014's mention
of the same.

## Decision
- The `needs-visual-check` label no longer blocks `automerge`. `.github/workflows/ci.yml`'s `automerge` job
  merges every non-draft, non-Dependabot PR once `server`, `app`, `docs` and `lint` are green — visual/3D/CSS
  changes included.
- The label itself still exists (nothing deletes it from the repo) but nothing creates or checks it anymore.
  `CLAUDE.md`, the skills, the PR template and the owners' guide (`docs/for-owner/huong_dan/13-lam-viec-2-nguoi.md`)
  no longer mention it.

## Why
Owner (ngoc), 2026-11-11: "giờ bỏ hết các tag needs-visual-check đi để tự động hoàn toàn" — after confirming
twice (once for a specific PR, once for the gate in general) that losing the manual look-before-merge step for
visual changes was an accepted trade-off for full automation.

## Consequences
- A visual/3D regression can now reach `chua.io.vn` without either owner having looked at it first; the only
  net left is `npm run check` (types, tests, docs, lint) and whatever a screenshot-based test would catch.
- An owner can still look with `npm run dev` before or after a merge; nothing stops that, it is just no longer
  enforced by CI.
- If the owners want the gate back, a new decision supersedes this one and the `automerge` condition in
  `ci.yml` gets `!contains(github.event.pull_request.labels.*.name, 'needs-visual-check')` restored.
