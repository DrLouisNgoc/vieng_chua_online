# Decision 0017: One strict lint/format standard, enforced locally and in CI

Date: 2026-11-11.

## Decision
- **Tools** (root `package.json`, dev only, never installed on the VPS):
  - Prettier.
  - ESLint 10, with these layers in order: Airbnb via `eslint-config-airbnb-extended` (base + TypeScript, import
    rules) → typescript-eslint `strictTypeChecked` + `stylisticTypeChecked` (type-aware; parsed by the root's
    `typescript@6.0`) → unicorn, regexp, security, sonarjs, eslint-comments → `simple-import-sort` + import-x →
    project limits → `eslint-plugin-oxlint` → `eslint-config-prettier`.
  - oxlint + oxlint-tsgolint, Stylelint (`stylelint-config-standard`), knip, actionlint (CI only).
  - TypeScript `strict` in `app/` as in `server/`.
- **Enforcement, four layers**: a Claude Code PostToolUse hook formats every file Claude edits; lefthook
  `pre-commit` fixes and lints staged files; lefthook `pre-push` runs `npm run check`; CI's required `lint` job runs
  everything with zero warnings allowed. No `--no-verify`. A rule may be disabled only on one line, with a reason.
- **Existing findings** (1048 at adoption) are recorded in `eslint-suppressions.json`, so CI is green while new code
  is held to the full standard from day one. `scripts/check-suppressions.mjs` fails CI if that file grows. It shrinks
  area by area during the cleanup and is then deleted and retired (`IS_RETIRED`).
- The rules, limits and deviations are in `docs/conventions.md` ("The standard").

## Why
Owner, 2026-11-11, asked for the strictest lint/format setup, enforced locally and in CI, followed by one big
refactor and then rules that keep code to standard so no big refactor is needed again. The owner chose:
- ESLint strict **and** oxlint;
- the Airbnb rules plus `eslint-config-prettier` and automatic import management;
- the recommended extra checks (Stylelint, knip, actionlint);
- the local hooks (lefthook and a Claude hook);
- running native binaries for oxlint, tsgolint, knip, lefthook and actionlint.

On the ESLint version: the original `eslint-config-airbnb-typescript` is unmaintained since 2024-03 and supports only
ESLint 8. Its successor `eslint-config-airbnb-extended` declares ESLint 9, but ESLint 9 is end-of-life. The owner
chose to try ESLint 10 with an npm `overrides` entry. It ran cleanly on the whole repo (56 s cold), so ESLint 10 stays.

## Consequences
- `npm ci` at the repo root is now required on each machine: it installs the tools and the git hooks.
- Lint is slower than before: about 1 minute cold for the whole repo, cached after that. The commit hook only
  touches staged files.
- `eslint-config-airbnb-extended` runs outside its declared peer range. If an upgrade breaks it, the fallback is
  either ESLint 9 or replacing the Airbnb layer with the equivalent plugin rules (`@stylistic`, import-x), which
  already support ESLint 10.
- `eslint-plugin-unicorn` stays on the latest version (79), because ESLint is 10.
- `npm audit` is 0 in all three package roots; the root overrides `minimatch` to 11.0.5 for that.

Ruling: Stylelint's `media-feature-range-notation` is set to `prefix` (keep `max-width:`) — the range syntax it
would write (`width <= 480px`) is ignored by Safari before 16.4, which would drop the phone layout for older iPhones —
cost if wrong: slightly older-looking CSS.
