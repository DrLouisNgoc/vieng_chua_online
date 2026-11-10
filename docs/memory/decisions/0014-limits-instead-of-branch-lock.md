# Decision 0014: Written limits instead of locking `main` on GitHub

Date: 2026-11-10. Amends decision 0012 (its "auto-merge" and "branch protection" parts).

## Decision
`main` gets **no** GitHub branch protection or ruleset. In its place, `CLAUDE.md` ("Workflow") sets limits that
both Claudes keep on every task:
1. No commits, pushes or local merges into `main`; every change goes through a PR.
2. A PR is merged only when `gh pr checks` shows every check passed, never on pending, failed or skipped.
3. No force-pushes.
4. One merge at a time: if `main` moved, rebase and wait for CI again.
5. A red deploy is reported to the owner at once, not fixed forward on `main`.
Breaking a limit needs the owner to confirm twice, after Claude names the rule and the risk.

GitHub auto-merge needs required status checks, which need branch protection. So `/xong` waits for CI itself
(`gh pr checks --watch`) and then runs `gh pr merge --squash --delete-branch`.

## Why
Owner, 2026-11-10, after the plan to lock `main` (guide 13, part A): "thôi không cần khóa nhánh main đâu, thêm
quy tắc giới hạn thôi" — no branch lock; add limiting rules instead.

## Consequences
- Nothing on GitHub stops a human or a Claude from pushing to `main`. What remains: the written limits, and
  `deploy.yml`, which deploys only after CI passed on that `main` commit, so a red push does not reach the site.
  A green-but-wrong direct push would still deploy without having been a PR.
- Two merges close together are not re-tested by GitHub on the combined code; limit 4 covers this by convention.
- If either owner later wants the hard lock back, guide 13's older version (git history) has the ruleset steps,
  and `/xong` can switch back to `gh pr merge --auto`.
