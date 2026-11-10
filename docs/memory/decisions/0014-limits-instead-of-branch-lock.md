# Decision 0014: No branch lock; CI merges green PRs itself; written limits

Date: 2026-11-10. Amends decision 0012 (its "auto-merge" and "branch protection" parts).

## Decision
- `main` gets **no** GitHub branch protection or ruleset.
- Flow: commit → push a task branch → open a PR → CI. When `server`, `app` and `docs` pass, CI's `automerge`
  job squash-merges the PR and dispatches `deploy.yml` with the merged commit. It does not merge drafts,
  Dependabot PRs, or PRs labelled `needs-visual-check`. It also refuses when `main` moved while CI ran, or when the
  PR head changed after the checks, and leaves a comment.
- `CLAUDE.md` ("Workflow") sets the limits both Claudes keep:
  - nothing goes into `main` except through a PR;
  - no manual `gh pr merge`;
  - `--force-with-lease` only on one's own task branch;
  - rebase when CI says `main` moved;
  - a red deploy is reported at once.
  Breaking a limit needs the owner to confirm twice.
- Both machines use **one GitHub account**: who works on what is shown by the labels `ngoc`/`anh`, not by the
  assignee. Commits carry each machine's own `git config user.name`.

## Why
Owner, 2026-11-10. Against the plan to lock `main`: "thôi không cần khóa nhánh main đâu, thêm quy tắc giới hạn
thôi". Then: "commit, push lên một branch, check ci xanh thì tự động merge pull request vào". And: the brother's
machine is already signed in to GitHub (the same account), so there is no collaborator to invite.

GitHub's own auto-merge needs required status checks, and those need branch protection. So the merge is done
by a workflow job instead.

## Consequences
- A merge made with `GITHUB_TOKEN` starts no other workflow, so `automerge` dispatches the deploy itself
  (`workflow_dispatch` is the documented exception). A manual merge or push to `main` still deploys through
  CI on `main` → `workflow_run`.
- Nothing on GitHub stops a direct push to `main`. If such a push is green but wrong, it deploys without ever being
  a PR. Only the written limits prevent that.
- Every green non-draft PR ships. Unfinished work must be opened as a draft.
- If the owners later want the hard lock back: add a ruleset requiring `server`, `app`, `docs`. `automerge` keeps
  working as it is.

Ruling: this decision was rewritten in place rather than superseded by a 0015. It was created the same day, in
commits never pushed, and the owner changed the plan twice within minutes. It never existed on `main`.
Cost if wrong: none for history, since git keeps the commits.
