---
name: refactor
description: Behaviour-preserving cleanup of one target in this repo ("/refactor <file or debt item>", "dọn code", "tách file"). Locks behaviour with tests, moves code verbatim first, cleans second, one small PR. Use for the tech-debt Issues listed in docs/memory/handoff.md.
---

# /refactor <target>

A refactor PR changes structure, **never behaviour**. No features, no bug fixes riding along (open an Issue for
any bug you spot instead).

1. Start like `/bat-dau` (Issue labelled `tech-debt`, branch `<owner>/<n>-refactor-<slug>`).
2. **Baseline.** `npm run check` must be green before you touch anything. Note the test counts.
3. **Lock behaviour.** If the code to move has no test that would notice a mistake, add one first through the
   public function (for 3D builders: mesh/group counts, names, positions, colliders, as
   `app/src/temple-grounds.test.ts` does). It must pass on the old code.
4. **Move verbatim.** Cut code into the new module(s) unchanged; only imports/exports and passing shared helpers
   in as parameters. `npm run check` → green, same test count or more.
5. **Then clean**, in separate commits: names, duplication, long functions (< ~60 lines), files (< ~400 lines).
   Check after each commit.
6. **Map.** Update `docs/architecture.md` for every new/moved file.
7. Finish with `/xong`. The PR title starts with `Refactor:` and the body says "pure refactor, no behaviour
   change" plus before/after line counts. Anything rendered (3D, CSS) → `needs-visual-check`, not auto-merge.

Order of the debt items, and why: `docs/memory/handoff.md` → "Open work".
