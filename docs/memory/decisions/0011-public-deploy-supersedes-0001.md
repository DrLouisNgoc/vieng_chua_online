# Decision 0011: Public deploy (chua.io.vn), superseding 0001's "no public deploy"

Date: 2026-11-10

## Decision
The app is now deployed publicly at `https://chua.io.vn` (real domain, HTTPS
via Caddy, no VPN/IP allowlist, no site-wide login) — reachable by anyone who
has the URL. This supersedes the "No public deploy" consequence of decision
0001.

## Why
Owner wants family/friends to reach the temple easily, without a VPN or
invite step. Raised explicitly during this deploy session that decision 0001
forbade exactly this because the app still serves copyrighted
sansatemple.com assets (3D models/textures, fetched by
`scripts/fetch-sansatemple-assets.sh`, decision 0006) that have not been
replaced with the owner's own (decision 0003/0009 — still not provided).
Owner chose to accept the copyright-exposure risk rather than add an access
gate (Tailscale or Basic Auth) in front of it.

## Consequences
- Decision 0001's personal-use restriction (private, never shared/published)
  no longer matches reality for *reachability* — anyone with the domain can
  view the sansatemple.com-derived assets. Monetization is still out of
  scope (unchanged from 0001); this decision only lifts the "no public
  deploy" part.
- Board/chat content (`server/data/boards.json`) and visitor names typed in
  are now also exposed to anyone who finds the URL, not just invited people.
- No access gate exists as of this decision. If the owner wants one later
  (Basic Auth on Caddy, or Tailscale), it's an opt-in addition, not a
  revert — ask before changing current public reachability back.

Ruling: public deploy with the still-unreplaced sansatemple.com assets,
no access gate — chosen by owner over keeping decision 0001's "no public
deploy" or adding an access gate first — cost if wrong: copyright exposure
if the domain becomes widely known/indexed, same risk 0001 originally
flagged, now accepted rather than mitigated.
