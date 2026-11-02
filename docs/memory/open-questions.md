# Open questions

See also the PRD's own Open Questions section:
docs/product/vieng-chua-online.prd.md

- **New finding, needs a decision**: the original site has a real-money
  donation flow (복전함/공양미) wired to the original developer's personal
  bank account and KakaoPay. This has been excluded from the asset manifest
  entirely (not deferred — excluded). Confirm this exclusion stands, in
  case the owner wants a *different* donation/support mechanic of their own
  later (not the original's).

- Which single interaction (절하기 / 목탁 / 염주) to build first for the
  MVP — Milestone 1 recon recommends 목탁 (moktak), since it's client-local
  (no server protocol needed beyond presence) and its assets/strings are
  fully identified. See docs/specs/milestone-1-asset-protocol-recon/
  protocol-notes.md. Still needs the owner's confirmation.
- Access control for the privately-deployed server — a URL alone isn't
  access control. Needs a decision before Milestone 4 (deploy).
- Where extracted original assets live during dev — committed to the repo
  (simple, but bloats history with third-party binary assets) vs. kept
  local-only/gitignored. Decided for now (see spec.md): Milestone 1's
  downloaded assets stayed in the session scratchpad, untracked, not
  committed — still need a final decision before Milestone 2 needs assets
  inside the actual project.
- Hosting provider/cost for the private cloud deployment — not chosen.
- Deferred past MVP per the PRD: save-progress storage design, scene/content
  customization, custom meditation audio — no tech decisions needed until
  those milestones are picked up.
- Process formality: resolved — owner chose the full gated dev-team process
  (spec → design → plan → build). PRD is written; next is /dev-team:spec.
