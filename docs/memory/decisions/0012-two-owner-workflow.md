# Decision 0012: Two owners, two Claudes — Issues, PRs, CI gate, auto-merge

Date: 2026-11-10

## Decision
Two owners (Ngọc, and Ngọc's older brother, who does not code) each work with their own Claude on their own machine,
sharing only the GitHub repo. From now on:
- **GitHub Issues** is the single task board.
- Every change goes through a branch and a PR; nobody pushes `main`.
- **CI** (`.github/workflows/ci.yml`: typecheck, tests, build, docs check) is required on every PR.
- PRs **merge themselves when CI is green** (GitHub auto-merge), with no human review — except PRs labelled
  `needs-visual-check` (3D/CSS changes only visible by eye), which an owner merges after looking.
- Deploy runs only after CI passed on `main` (`deploy.yml` on `workflow_run`), one at a time.
- No staging environment for now: CI blocks, and a bad merge is undone by reverting the PR.
- Tech debt is paid down after this foundation, one small behaviour-preserving PR at a time, interleaved with
  features (order in `handoff.md`).
- Project rules live in the repo (`CLAUDE.md`, `docs/architecture.md`, `docs/conventions.md`,
  `.claude/settings.json`, `.claude/skills/`), so both Claudes follow the same ones. They override a machine's
  global rules where they conflict.

## Why
Owner, 2026-11-10: two people fix small things almost continuously, 100% through Claude, with heavy tech debt;
they asked for a way for two Claudes to keep the whole project in view as it grows, with shared process and rules,
less context/limit spend, and clean structure. The answers to the planning questions were: auto-merge when CI is
green; no staging yet (CI + revert); foundation first then refactor gradually; GitHub Issues for tracking.
Before this, every commit went straight to `main` and deployed with no tests run; the only rules lived in one
owner's global `~/.claude/CLAUDE.md`, which the other machine does not have; and `handoff.md` (24 KB) was read
in full every session and edited by everyone.

## Consequences
- Pushing a **branch** and opening a PR is green tier for Claude in this repo (it used to be red: "git push to a
  shared remote"). Pushing `main`, force-pushing, and merging past a red CI stay red. The owner moved this item
  by choosing auto-merge.
- CI is the only reviewer, so a check must never be weakened to get green; flaky tests are bugs.
- Memory changed shape: `handoff.md` ≤ 5 KB and current state only; `lessons.md` holds gotchas; the session log
  is retired (history = git + PRs). Old files are in `docs/memory/archive/`.
- GitHub-side settings (branch protection, auto-merge, collaborator access) and the VPS `deploy.sh` hardening
  are applied by the owner: `docs/for-owner/huong_dan/13-lam-viec-2-nguoi.md`, file 11.

Ruling: milestone specs stay where they are in `docs/specs/` instead of moving to an archive folder — 12 files
and code comments link to those paths, and the "do not read unless needed" rule in CLAUDE.md gives the same
context saving — cost if wrong: a Claude may still open them by habit; then move them and fix the links.
