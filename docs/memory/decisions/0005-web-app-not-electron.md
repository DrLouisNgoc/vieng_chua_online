# Decision 0005: Web app, not Electron — supersedes 0002

Date: 2026-11-02

## Decision
Build a web app (browser client + own backend server), not an Electron
desktop package. This supersedes decision 0002.

## Why
Owner corrected course during PRD framing: no need for a packaged
desktop app; a web app reachable from the browser is what's wanted,
consistent with decision 0004's "own backend, privately deployed on cloud,
reachable only by the owner" (remote access from a browser fits better than
a desktop package).

## Consequences
- Drop all Electron main/renderer-process planning from decision 0002.
- Client is a browser-based web frontend (framework TBD in the spec phase)
  reusing the 3D/audio assets per decision 0003, talking to the owner's own
  backend per decision 0004.
- Access control for the privately-deployed server (decision 0004) now
  matters more, since any browser pointed at the URL could reach it absent
  auth — needs to be addressed in the spec, not left implicit.
