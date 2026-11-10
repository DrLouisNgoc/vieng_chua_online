# Viếng Chùa Online — rules for every Claude session

A Vietnamese 3D virtual temple (Vite + Three.js client in `app/`, Node `ws` + HTTP server in `server/`), live at
`https://chua.io.vn`. Two owners work on it from two machines, each with their own Claude, sharing only this
GitHub repo. Neither reviews code by reading it: **CI is the only gate**, and only these rules make it one. These rules are what keep two Claudes
consistent. They override any global/user-level routine that conflicts with them (e.g. writing a log line or a
long handoff).

## Read first, and only this
1. `docs/memory/handoff.md` (short: current state, open work).
2. `docs/architecture.md` (one line per source file). Use it to pick files; do not explore the tree.
3. When writing code: `docs/conventions.md`. When touching 3D, avatar bones, the proxy/ip, audio or deploy:
   grep `docs/memory/lessons.md` for the topic.
Do **not** read `docs/specs/milestone-*`, `docs/memory/archive/` or `docs/for-owner/` unless the task is about
that milestone or guide. Before re-deciding anything, check `docs/memory/decisions/`.

## Workflow (both owners, every task)
- Start with `/bat-dau <task>`; finish with `/xong`. Refactors use `/refactor <target>`.
- **GitHub Issues is the task board.** One task = one Issue = one branch `<owner>/<issue#>-<slug>` = one small PR.
  `<owner>` is `ngoc` or `anh` (ask once per machine if `git config user.name` does not make it obvious). Both
  machines use **the same GitHub account**, so "who is on it" is the label `ngoc`/`anh` on the Issue and PR,
  never the assignee.
- **Flow:** commit → push the task branch → open the PR → CI runs → when `server`, `app` and `docs` are all green,
  CI's `automerge` job squash-merges the PR and starts the deploy. Nobody merges by hand except
  `needs-visual-check` PRs.
- **`main` is not locked on GitHub (owner's choice, decision 0014), so these limits are the lock. Both Claudes
  keep them every time, even if asked to "just push it":**
  1. Never commit to, push to, or merge locally into `main`. All changes go through a PR.
  2. Never run `gh pr merge` yourself; CI merges when every check is green. Never merge on pending or red,
     never skip CI, never open a PR as "ready" while it is unfinished (use `--draft`; drafts are not merged).
  3. Force-push (`--force-with-lease` only) is allowed on your own task branch after a rebase; never on `main`
     or on someone else's branch.
  4. If CI comments "`main` moved while CI ran", rebase on `main`, push, and let CI run again.
  5. Merging deploys. If the deploy run goes red, tell the owner at once; do not try to "fix forward" on `main`.
  If an owner explicitly tells you to break one of these limits, say which rule it breaks and what can go
  wrong, and do it only after they confirm a second time.
- Keep a PR under ~1 day of work and ~400 changed lines (except mechanical moves/formatting). Rebase on `main`
  before opening the PR: `git fetch origin && git rebase origin/main`.
- Check open PRs before editing a big shared file (`gh pr list`); if another open PR touches the same file, say
  so and keep the change minimal or wait.
- A PR changing only things you can see (3D, CSS, layout) gets the label `needs-visual-check` **when it is
  created**; CI then does not merge it. The owner runs `npm run dev`, looks, then presses Merge on GitHub.

## Commands
- `npm run check` — typecheck + tests (server, app) + docs check. Must pass before every commit you push.
- `npm run dev` — server on :8787 + app on http://localhost:5173. Needs the gitignored assets in
  `app/public/sansatemple/` (`scripts/fetch-sansatemple-assets.sh`) for models/textures.
- Single file: `cd app && npx vitest run src/x.test.ts`.

## Coding rules
- **TDD**: a failing test first, then the code. A bug fix starts with a test that reproduces it.
- Smallest change that solves the task. No unrequested features, no refactors outside the task's files.
- Never make CI green by deleting, skipping (`.skip`, `.only`), or loosening a test or a check. If a test is wrong,
  say why in the PR.
- New or moved source file → update its line in `docs/architecture.md` in the same PR.
- Files stay under ~400 lines, functions under ~60. Touching an oversized file: do not grow it; put new code in a
  new module.
- Pure logic (maths, state, parsing) lives apart from Three.js/DOM so it can be unit-tested.
- A new dependency needs a reason in the PR description and a look at its licence and install scripts.
- Code, comments, commits, PR text and docs under `docs/` (except `docs/for-owner/`): English.
  Guides for the owners: `docs/for-owner/` in Vietnamese. Talk to the owners in Vietnamese.

## Autonomy
- **Green, just do it:** read, edit inside the repo, run tests/builds, commit on a branch, push a branch
  (`--force-with-lease` on your own task branch after a rebase), open a PR, create/comment/close/label Issues,
  create the labels `ngoc`, `anh`, `tech-debt`, `needs-visual-check` if missing.
- **Yellow, do it and say so in the PR:** add or remove a dependency; delete tracked files; edit a workflow in
  `.github/`.
- **Red, ask the owner first, every time:** anything on the VPS (`ssh`, `scp`, editing `deploy.sh`, Caddy,
  systemd); GitHub repo settings or secrets; passwords or `server/data/`; any other force-push; merging a PR by
  hand; anything outside the repo folder.

## Context economy (saves both owners' limits)
- One task per session; `/clear` between tasks.
- Grep, then read the needed line range. Do not read whole large files (`temple-grounds.ts`, `scene.ts`,
  `style.css`, `boards-panel.ts`) end to end.
- No subagents for small tasks. For a one-line fix, do not re-plan the project.
- Do not paste long logs into replies; summarise.

## Memory (in git, shared by both machines)
- `docs/memory/handoff.md` — ≤ 5 KB, current state only. Update it only when the project's overall state
  changes (a feature ships, a known problem appears or goes away). Per-task status lives in the Issue/PR.
- `docs/memory/decisions/NNNN-*.md` — one per decision, never edited; a new one supersedes an old one.
- `docs/memory/lessons.md` — gotchas worth knowing next time; add one line when you learn one the hard way.
- `docs/memory/open-questions.md` — questions waiting for an owner's answer.
- History lives in git and PR descriptions; there is no log file to append to.

## Reports
End each finished task's reply with what was verified (command + result) and `Not checked:` (what you did not
run or look at). When you decide something on your own, write it in the PR as
`Ruling: <decision> — <why> — <cost if wrong>`.
