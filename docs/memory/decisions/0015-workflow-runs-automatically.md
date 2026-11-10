# Decision 0015: The start/finish workflow runs automatically

Date: 2026-11-10. Amends decision 0012 ("the owner types `/bat-dau` and `/xong`").

## Decision
The owners never have to type a command. On any message that asks for a change to the repo, Claude does the
steps in `.claude/skills/bat-dau/SKILL.md` before editing, or `refactor` for cleanup work. As soon as the change
is complete and `npm run check` passes, Claude does the steps in `.claude/skills/xong/SKILL.md` without being
asked: PR, then CI auto-merge, then deploy. The rule lives in `CLAUDE.md` ("Workflow"), and each skill's
description says to use it automatically. The slash commands still work when typed.

## Why
Owner, 2026-11-10, after the commands were explained: "không cần, cho tự động đi".

## Consequences
- Every finished change ships without the owner saying "done". To try something without shipping it, the owner
  says so ("làm thử thôi") and Claude opens a draft PR, which CI never merges. When it is unclear whether the owner
  wants it shipped, Claude asks once.
- Questions and explanations that change no file create no Issue or branch.
