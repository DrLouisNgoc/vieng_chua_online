---
name: bat-dau
description: Start a task in this repo ("bắt đầu", "/bat-dau <việc>"). Syncs main, finds or opens the GitHub Issue, makes the branch, loads only the context the task needs, then works test-first. Use at the start of every task, by either owner.
---

# /bat-dau <task>

The owner may not read code. Explain each step in one short Vietnamese sentence; keep commands in English.

1. **Clean start.** `git status --short`. If there are uncommitted changes, stop and ask what they are (never
   discard them). Then `git switch main && git fetch origin && git rebase origin/main`.
2. **Issue.** `gh issue list --state open --limit 30`. If an open Issue matches the task, use it; if it is
   assigned to the other owner, stop and say so. Otherwise create one:
   `gh issue create --title "<short English title>" --body "<what the owner asked, their words quoted; files likely touched>"`.
   Assign it to yourself: `gh issue edit <n> --add-assignee @me`.
3. **Collisions.** `gh pr list --state open`; for each, `gh pr diff <n> --name-only`. If one touches the files
   this task needs, tell the owner which PR and suggest waiting or keeping the change tiny.
4. **Branch.** `git switch -c <owner>/<n>-<slug>` (`ngoc` or `anh`; from `git config user.name`, ask once if
   unclear).
5. **Context, minimal.** Read `docs/memory/handoff.md` and `docs/architecture.md`; pick the files from the map;
   grep `docs/memory/lessons.md` for the topic. Do not explore the tree or read `docs/specs/` unless needed.
6. **Restate** the task in 1–3 Vietnamese sentences with what "done" will look like and how it will be checked.
   If the request is ambiguous, ask one focused question before coding.
7. **Build test-first** (CLAUDE.md coding rules): failing test → code → `npm run check`.
   Commit in small steps with `Refs #<n>` in the body.

When the work is done, run `/xong`.
