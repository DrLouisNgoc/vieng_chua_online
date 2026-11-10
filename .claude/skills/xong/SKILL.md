---
name: xong
description: Finish a task in this repo. Use AUTOMATICALLY, without being asked, as soon as a requested change is complete and npm run check passes; also when typed as /xong. Updates docs that must change with the code, rebases, pushes the branch, opens the PR; CI merges it by itself when every check is green and deploys (or it is flagged for a visual check).
---

# /xong

Explain each step to the owner in one short Vietnamese sentence.

1. **Not on main.** `git branch --show-current` must not be `main`. If it is, do the bat-dau steps first
   (Issue, branch) and move the changes onto that branch (`git switch -c <branch>` keeps uncommitted edits).
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
6. **PR** (not a draft, or CI will not merge it): `gh pr create --fill-first --label <owner>`, plus
   `--label needs-visual-check` for a visible-only change (3D, CSS, layout) — **at creation**, since CI reads the
   labels when it starts. Then edit the body: what and why; how it was verified (commands + results);
   `Not checked:`; any `Ruling:` lines; `Closes #<n>`.
7. **CI merges it by itself.** The `automerge` job in `.github/workflows/ci.yml` runs after `server`, `app`, `lint`,
   `docs` pass, squash-merges the PR and starts the deploy. You do **not** run `gh pr merge` yourself.
   Watch: `gh pr checks --watch`, then `gh pr view --json state -q .state` should become `MERGED`.
   - A check red → `gh run view --log-failed`, fix, commit, push; CI runs again. Never weaken a test or check.
   - Comment "Not merged: `main` moved while CI ran" → `git fetch origin && git rebase origin/main`,
     `npm run check`, `git push --force-with-lease` (your own task branch only), watch again.
   - `needs-visual-check` → **stop** here. Tell the owner: `git switch <branch>`, `npm run dev`, look at <what>,
     then press Merge on GitHub (CI must be green); merging by hand also deploys.
8. **Deploy**: `gh run list --workflow "Deploy to VPS" --limit 1` should turn green within a few minutes.
   Red → tell the owner at once (deploy.sh has already rolled back to the previous version).
9. **Report** in Vietnamese: PR link, what changed for visitors, what was verified, `Not checked:`.
   Suggest `/clear` before the next task.
