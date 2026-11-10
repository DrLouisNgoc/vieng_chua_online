---
name: xong
description: Finish a task in this repo ("xong", "/xong"). Runs the full check, updates docs that must change with the code, rebases, pushes the branch, opens the PR and turns on auto-merge (or flags it for a visual check). Use at the end of every task, by either owner.
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
7. **Merge mode.**
   - Logic/server/test/docs change: `gh pr merge --auto --squash --delete-branch`. It merges itself when CI is
     green, then deploys.
   - Visible-only change (3D, CSS, layout): `gh pr edit --add-label needs-visual-check`, **no** auto-merge.
     Tell the owner: pull this branch, `npm run dev`, look at <what>, then press Merge on GitHub.
8. **Watch CI**: `gh pr checks --watch`. Red → read the failing log (`gh run view --log-failed`), fix, push again.
9. **Report** in Vietnamese: PR link, what changed for visitors, what was verified, `Not checked:`.
   Suggest `/clear` before the next task.
