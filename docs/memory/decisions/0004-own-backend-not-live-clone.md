# Decision 0004: Own backend server, not connecting to sansatemple.com's live service

Date: 2026-11-02

## Context
Technical inspection (screenshot + CDP capture of the live site) showed
sansatemple.com is not a static page: it's a real-time multiplayer 3D app
(Three.js/WebGL, skinned character animation) with its own backend —
room/instance selection, a live player count ("03/100"), a "서버 선택" (choose
server) control, and reconnect-on-drop behavior. This was not known when
decisions 0001–0003 were made.

## Decision
Build a personal backend server (owned and run by the owner) for the
multiplayer/room features, instead of either (a) dropping multiplayer
entirely, or (b) having the client talk to sansatemple.com's real
infrastructure.

## Why
Owner's explicit choice. Talking to the real service's backend directly would
mean depending on, and likely violating the terms of, a third party's live
infrastructure (and risks IP/account blocking) — ruled out. A from-scratch
backend keeps the whole stack under the owner's control and matches "add my
own features" from the original goal.

## Consequences
- The client (Electron app, reused original 3D/audio assets + Vietnamese
  text, per decisions 0002/0003) will talk to a new, owner-run server, not
  sansatemple.com's.
- The multiplayer *protocol* (message shapes, what the server needs to track)
  can be inferred from observing the client's own network/WebSocket traffic
  during passive inspection — the client code is being reused anyway — but no
  calls will be made to the real production backend beyond what's needed to
  load the public client assets once.
- This is now a two-sided build (client + server), not just an asset/text
  swap. Scope grew substantially from the original ask.

Ruling: build an owner-run backend instead of a single-player-only fallback
or connecting to the real service — chosen by owner — cost if wrong: notably
more build effort (server design, state sync, hosting) for a personal hobby
app; revisit decision 0001's "never shared" scope once a server exists, since
a server is inherently reachable beyond just the owner's own device and needs
its own access control.
