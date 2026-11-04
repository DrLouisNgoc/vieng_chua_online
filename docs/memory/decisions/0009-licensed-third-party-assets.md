# Decision 0009: Licensed third-party assets may be added beyond sansatemple.com's

Date: 2026-11-04
Amends (does not replace) decision 0003.

## Decision
To reach a richer, game-like look, the project may now use 3D models,
animations, textures and audio from sources other than sansatemple.com,
provided each one:
- comes from a source whose licence clearly allows this personal,
  never-published use (CC0, CC-BY with attribution, a purchased licence, or
  the owner's own work / owner-downloaded Mixamo content under Adobe's
  terms);
- is recorded in `docs/assets/third-party-assets.md` (file, source URL,
  author, licence, date) before it is used in code;
- lives in `app/public/thirdparty/`, which is gitignored (same reasoning as
  decision 0006: no third-party binaries in git history).
sansatemple.com's own assets stay as they are (decision 0003 still holds for
them). chuasen.com's assets and code are still not taken beyond decision
0007/0008.

## Why
The owner asked how to get close to chuasen.com's quality. The gap is
mostly 3D content (rigged characters with animation clips, temple
architecture, audio), which sansatemple.com's asset set does not contain.
The owner approved this in chat ("1, 2, 3, 4, 5 trước đi") after being told
it changes decision 0003's scope.

## Consequences
- Downloads need the owner's explicit approval per file (filename, source,
  size), and logins (Adobe/Mixamo, Sketchfab) are done by the owner, not
  Claude.
- A licence that is unclear, missing, or "editorial/non-commercial only with
  restrictions" → not used.
- Deploying privately later (Milestone 5) must ship these files too, same
  open problem as decision 0006.
