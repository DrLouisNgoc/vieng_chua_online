# Open questions

See also the PRD's own Open Questions section:
docs/product/vieng-chua-online.prd.md

- **Resolved**: the original site's donation flow (복전함/공양미), tied to
  the original developer's personal bank account/KakaoPay, stays excluded —
  confirmed by owner. Not reused in any form.
- **Future idea (not scoped, not MVP)**: owner wants a donation/offering
  feature later, backed by the owner's own public, fully transparent
  account — not a copy of the original's. This is NOT the same as decision
  0001's "never shared" app: a *public* donation account implies other
  people see/contribute to it, which is a different exposure surface than
  the private app itself. When this is actually planned, needs its own
  explicit scoping (e.g. a separate public donation page vs. something
  inside the private app) rather than silently stretching decision 0001.
  No action needed now — flagged for whenever this feature is picked up.

- **Resolved**: first MVP interaction was 목탁 (moktak), built in
  Milestone 2. Next interactions the owner asked for (2026-11-04): sit/
  meditate on a cushion, bow, prayer beads (original sansatemple features,
  need server messages per protocol-notes.md), and sweeping the yard (new,
  not an original feature). Order not chosen yet.
- **Resolved, 2026-11-10** (decision 0011): no access control in front of
  `chua.io.vn` — owner chose public reachability over an access gate,
  accepting the copyright-exposure risk decision 0001 originally flagged.
  Revisit only if the owner asks to add one later.
- **Resolved** (decision 0006): extracted assets are a gitignored local
  cache.
- **Resolved, 2026-11-10**: owner's own VPS + domain `chua.io.vn`, Caddy
  reverse proxy, systemd service — live now (no Tailscale, see above).
- Frame rate 11-15 fps on the owner's machine class (Intel UHD) in the big
  hall — acceptable to the owner? Main cost not identified yet.
- Is the 76x54 hall what "gấp 10 lần" meant (10x area), or 10x each side?
  See status.md ruling.
- Yard size: "nhỏ đi 2 lần" read as half the area (front 130, sides 53);
  the alternative is halving each gap (105 / 42.5). Not confirmed.
- Third-party assets (decision 0009): owner said they would provide a
  Mixamo character + animations, audio and reference screenshots; none
  provided yet. Architecture: owner chose procedural (no purchase).
- Deferred past MVP per the PRD: save-progress storage design, scene/content
  customization, custom meditation audio — no tech decisions needed until
  those milestones are picked up.
- Process formality: resolved — owner chose the full gated dev-team process
  (spec → design → plan → build). PRD is written; next is /dev-team:spec.
