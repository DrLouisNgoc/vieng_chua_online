# Conventions

How code in this repo is written. Match these; when a file still breaks one, leave it no worse than you found it.

## Layout
- `app/src/` — client. `server/src/` — server. Flat folders today; new groups of 3+ related files go in a
  subfolder (`app/src/grounds/`, `app/src/boards/`) as the big files are split.
- One file, one responsibility, under ~400 lines. One function under ~60 lines.
- Tests sit next to the code: `x.ts` → `x.test.ts`.

## The standard, and how it is enforced (decision 0017)
Write code that passes `npm run check` the first time. Nothing here is advisory: every rule is an error, and
four layers enforce it, so code never drifts and never needs a big cleanup again.

| Layer | When | What runs |
|---|---|---|
| Claude Code hook (`.claude/settings.json` → `scripts/claude-format.mjs`) | After every Edit/Write by Claude | Prettier + oxlint safe fixes on that file |
| lefthook `pre-commit` (`lefthook.yml`) | `git commit` | Prettier, oxlint, ESLint, Stylelint on the staged files; fixes (not ESLint's) are re-staged, the rest blocks the commit |
| lefthook `pre-push` | `git push` | `npm run check` (everything CI runs) |
| CI `lint` job (required before automerge) | Every PR | `format:check`, oxlint, ESLint `--max-warnings 0`, Stylelint, knip, actionlint |

- **Never** `git commit --no-verify` / `git push --no-verify`. CI runs the same checks, so it only moves the failure.
- `npm run lint:fix` applies every safe fix; what is left needs a real change.
- A rule that is genuinely wrong for **one line**: `// eslint-disable-next-line <rule> -- <why it is wrong here>`.
  A disable without a reason, a file-wide disable, or a blanket disable fails lint
  (`@eslint-community/eslint-comments`).
- `eslint-suppressions.json` holds only findings from before 2026-11-11, and shrinks as each area is cleaned. Never
  add to it (`--suppress-all` / `--suppress-rule` are forbidden for new code); it is deleted when it reaches zero.

### Tools
- **Prettier** (`.prettierrc.json`): width 120, double quotes, semicolons, trailing commas. Formatting is never
  ESLint's job (`eslint-config-prettier` turns those rules off).
- **ESLint 10** (`eslint.config.mjs`), in order: Airbnb (`eslint-config-airbnb-extended`, base + TypeScript) →
  typescript-eslint `strictTypeChecked` + `stylisticTypeChecked` (type-aware) → unicorn, regexp, security,
  sonarjs, eslint-comments → imports → project rules → `eslint-plugin-oxlint` → `eslint-config-prettier`.
- **oxlint** (`.oxlintrc.json`): fast first pass; ESLint skips the rules it covers.
- **Stylelint** (`.stylelintrc.json`): `stylelint-config-standard`; class names are BEM in kebab-case
  (`block__element--modifier`); media queries keep `max-width:` (range syntax breaks Safari < 16.4).
- **knip** (`knip.json`): no unused files, exports, types or dependencies.
- **TypeScript**: `strict` in both `app/` and `server/`.

### Imports
- Sorted automatically (`simple-import-sort`); type-only imports are a separate `import type` line.
- Server: relative imports end in `.js` (NodeNext). App: no extension (Vite).
- No cycles, no duplicates, no undeclared packages, no default exports (config files excepted).

### Limits (lint errors, not suggestions)
File ≤ 400 lines · function ≤ 60 lines · complexity ≤ 15 · nesting ≤ 4 · ≤ 4 parameters (more → one options
object) · strict boolean conditions (compare explicitly: `if (list.length > 0)`, `if (name !== "")`).

### Deviations from Airbnb / unicorn, and why
- `for…of` is allowed — Airbnb bans it for ES5 regenerator reasons; the target is ES2023.
- `import-x/prefer-default-export` off, `no-default-export` on — named exports only.
- `no-underscore-dangle` allows a leading `_` on parameters — it marks an intentionally unused name.
- `unicorn/no-null` off — the JSON wire protocol uses `null` on purpose.
- `unicorn/prevent-abbreviations` and `unicorn/name-replacements` off — would rename thousands of identifiers,
  including Vietnamese domain words.
- `security/detect-object-injection` and `security/detect-non-literal-fs-filename` off — false positives on every
  `obj[key]` and on fs paths that our own code builds.
- `unicorn/no-unused-builtin-method-return` off — it matches by method name, so every `room.join(id, …)` read as a
  discarded `Array#join` (all 22 hits at adoption were false positives).
- `import-x/no-relative-packages` off — `shared/` is the deliberate protocol folder both packages import by relative
  path; there is no package to import it from.

## Naming
- Files: `kebab-case.ts` everywhere (`unicorn/filename-case`). Server files still in camelCase are renamed in the
  cleanup phase.
- Factories: `createX(...)` returning an interface `X` (e.g. `createBoardStore`, `createPresenceRoom`).
- Constants: `UPPER_SNAKE_CASE` at module top, with a comment saying where the number comes from.
- Types: `interface` for object shapes, `type` for unions.

## Structure
- Pure logic (layout maths, state machines, parsing, protocol) has no Three.js or DOM import and is unit-tested.
  Wiring files (`*-runtime.ts`, `*-panel.ts`, `scene.ts`, `main.ts`) stay thin and call the pure modules.
- Everything a client sends is untrusted: the server parses into exact shapes (`server/src/protocol.ts`) and
  rejects the rest.
- A missing optional asset (sound, photo) is never an error: warn once and show a placeholder.
- No `any`; prefer `unknown` + a check. Errors that are expected noise (bad JSON from a client) return `null`
  instead of throwing.
- Comments say **why** (a constraint, an owner decision with its date and quote), not what the next line does.

## Tests (Vitest)
- Test behaviour through the public function, not private details.
- Server tests use a fresh temp file for anything persisted (`freshVisitorNamesPath()` in `server.test.ts`),
  never `server/data/`.
- Timing: prefer `vi.useFakeTimers()` over real `setTimeout` waits, so CI does not flake.
- A test that fails sometimes is a bug: fix it in its own PR, never retry or skip it.

## Git
- Branch: `<owner>/<issue#>-<slug>`, e.g. `ngoc/42-fix-ip-cap`.
- Commit subject: imperative, ≤ 72 chars, says what changes for the visitor or the code ("Count connections per
  real visitor ip, not the proxy's"). Body: why, and `Closes #42`.
- PR description: what and why, how it was verified, `Not checked:`, any `Ruling:` lines.

## Docs
- English, short. One fact lives in one place; link to it instead of copying it.
- `docs/architecture.md` is updated in the same PR as the code it describes (`npm run check:docs` enforces it).
