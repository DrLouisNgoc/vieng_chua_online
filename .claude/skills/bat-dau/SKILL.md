---
name: bat-dau
description: Start a task in this repo ("bắt đầu", "/bat-dau <việc>"). Syncs main, finds or opens the GitHub Issue, makes the branch, loads only the context the task needs, then works test-first. Use at the start of every task, by either owner.
---

# /bat-dau <task>

The owner may not read code. Explain each step in one short Vietnamese sentence; keep commands in English.

1. **Clean start.** `git status --short`. If there are uncommitted changes, stop and ask what they are (never
   discard them). Then `git switch main && git fetch origin && git rebase origin/main`.
2. **Who am I.** `<owner>` is `ngoc` or `anh`, from `git config user.name` (ask once if unclear). Both machines
   use the same GitHub account, so the owner is shown by **label**, never by assignee. First time on a machine:
   `gh label create ngoc --force; gh label create anh --force; gh label create tech-debt --force;
   gh label create needs-visual-check --force`.
3. **Issue.** `gh issue list --state open --limit 30 --json number,title,labels`. If an open Issue matches the
   task, use it; if it carries the other owner's label, stop and say so. Otherwise create one:
   `gh issue create --title "<short English title>" --label <owner> --body "<what the owner asked, their words quoted; files likely touched>"`.
   Picking up an unlabelled one: `gh issue edit <n> --add-label <owner>`.
4. **Collisions.** `gh pr list --state open`; for each, `gh pr diff <n> --name-only`. If one touches the files
   this task needs, tell the owner which PR and suggest waiting or keeping the change tiny.
   **Branch:** `git switch -c <owner>/<n>-<slug>`.
5. **Context, minimal.** Read `docs/memory/handoff.md` and `docs/architecture.md`; pick the files from the map;
   grep `docs/memory/lessons.md` for the topic. Do not explore the tree or read `docs/specs/` unless needed.
6. **Restate** the task in 1–3 Vietnamese sentences with what "done" will look like and how it will be checked.
   If the request is ambiguous, ask one focused question before coding.
7. **Build test-first** (CLAUDE.md coding rules): failing test → code → `npm run check`.
   Commit in small steps with `Refs #<n>` in the body.

When the work is done, run `/xong`.
