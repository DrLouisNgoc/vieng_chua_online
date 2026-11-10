---
name: xong
description: Finish a task in this repo ("xong", "/xong"). Runs the full check, updates docs that must change with the code, rebases, pushes the branch, opens the PR, waits for CI and merges only when every check is green (or flags it for a visual check). Use at the end of every task, by either owner.
---

# /xong

Explain each step to the owner in one short Vietnamese sentence.

1. **Not on main.** `git branch --show-current` must not be `main`. If it is, stop and run `/bat-dau` first.
2. **Docs that travel with the code** (same PR):
   - Source file added/moved/renamed or its job changed → its line in `docs/architecture.md`.
   - Learned a gotcha → one line in `docs/memory/lessons.md`.
   - Project state changed (feature shipped, known problem appeared/fixed) → `docs/memory/handoff.md`, ≤ 5 KB.
   - An owner made a decision → new `docs/memory/decisions/NNNN-*.md` (never edit an old one).
   - Something the owners must do by hand → a Vietnamese note under `docs/for-owner/`.
3. **Rebase + check.** `git fetch origin && git rebase origin/main`, then `npm run check`. If anything fails,
   fix it — never skip, delete or loosen a test or check. Conflicts you cannot resolve with certainty: stop and
   ask the owner.
4. **Commit** what is left: imperative subject ≤ 72 chars; body says why; `Closes #<n>`.
5. **Push the branch**: `git push -u origin HEAD`.
6. **PR**: `gh pr create --fill-first` then edit the body to contain: what and why; how it was verified
   (commands + results); `Not checked:`; any `Ruling:` lines; `Closes #<n>`.
7. **Wait for CI**: `gh pr checks --watch --fail-fast`. Red → read the failing log
   (`gh run view --log-failed`), fix, push again, wait again. Never merge on red or pending (CLAUDE.md limits).
8. **Merge** (`main` is not locked on GitHub; this step is the lock):
   - Visible-only change (3D, CSS, layout): `gh pr edit --add-label needs-visual-check` and **stop**. Tell the
     owner: pull this branch, `npm run dev`, look at <what>, then press Merge on GitHub once CI is green.
   - Otherwise, right before merging:
     - `gh pr checks` again: every line must be `pass` (the `server`, `app` and `docs` jobs at least).
     - `gh pr view --json mergeable,baseRefName -q '.mergeable + " " + .baseRefName'` must print
       `MERGEABLE main`.
     - If `main` moved since CI ran (`git fetch origin && git log HEAD..origin/main --oneline` prints anything):
       rebase, push, back to step 7.
     - Then `gh pr merge --squash --delete-branch`. Merging deploys; `gh run list --workflow "Deploy to VPS"
       --limit 1` should turn green within a few minutes. Red → tell the owner at once.
9. **Report** in Vietnamese: PR link, what changed for visitors, what was verified, `Not checked:`.
   Suggest `/clear` before the next task.
