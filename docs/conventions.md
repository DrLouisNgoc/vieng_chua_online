# Conventions

How code in this repo is written. Match these; when a file still breaks one, leave it no worse than you found it.

## Layout
- `app/src/` — client. `server/src/` — server. Flat folders today; new groups of 3+ related files go in a
  subfolder (`app/src/grounds/`, `app/src/boards/`) as the big files are split.
- One file, one responsibility, under ~400 lines. One function under ~60 lines.
- Tests sit next to the code: `x.ts` → `x.test.ts`.

## Formatting
- Prettier (`.prettierrc.json`: width 120, double quotes, semicolons, trailing commas). Run `npm run format`
  (repo root, after `npm ci` there) before committing. Until the one-off reformat lands, format only the files
  you touch: `npx prettier --write <files>`.

## Lint
- ESLint (`eslint.config.mjs`): the recommended JS and typescript-eslint rules, plus `eqeqeq`, no `console.log`
  (`warn`/`error` are fine), `import type` for type-only imports, unused names allowed only with a leading `_`.
  CI blocks on it. A rule that is genuinely wrong for one line: `// eslint-disable-next-line <rule> -- <why>`,
  never a blanket disable.

## Naming
- Files: `kebab-case.ts` in `app/`, `camelCase.ts` in `server/` (existing style on each side; do not mix within a side).
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
