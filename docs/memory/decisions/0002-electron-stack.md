# Decision 0002: Package as an Electron app

Date: 2026-11-02

## Decision
Build the app as an Electron (Node.js + web frontend) desktop app, not Tauri
and not a plain local web app.

## Why
Owner chose Electron over Tauri for familiarity/debuggability and broader
web-3D library support, accepting the larger packaged-app size as a tradeoff.

## Consequences
- Project scaffold will be a standard Electron main/renderer split.
- Any 3D/WebGL rendering libraries used on the original site can be reused
  as-is inside the renderer process.
