# Decision 0013: Nightly backups and uptime checks run on GitHub Actions

Date: 2026-11-10

## Decision
- **Backup**: `.github/workflows/backup.yml`, nightly at 02:30 Vietnam time. Over the existing CI SSH key it
  tars `server/data/` on the VPS into `/opt/chua/backups/` (kept 14 days), downloads that archive and stores it as
  a private Actions artifact (kept 90 days). The run fails if the archive lacks `data/boards.json`.
- **Uptime**: `.github/workflows/uptime.yml`, **hourly**, curls `https://chua.io.vn/` and `/boards`. A failed run
  makes GitHub email the person who last changed the schedule.
- **Audit** moves from every PR to a weekly workflow; Dependabot opens grouped weekly upgrade PRs.

## Why
Owner, 2026-11-10, asked for "chuẩn production". `server/data/` (cốc content, hỏi pháp Q&A, password hashes,
pháp danh locks) existed only on the VPS, with no copy anywhere, and guide 12 still said backups were unnecessary.
Nothing noticed when the site went down. For storage and alerting the owner picked GitHub Actions (no new account,
reuses the SSH secret) over a VPS-only cron or Google Drive, and over UptimeRobot.

Ruling: uptime every hour, not every 15 minutes as offered — each run bills at least one Actions minute, so
96 runs a day (~2900 min/month) alone exceed the private repo's 2000 free minutes and would block CI and deploys
— cost if wrong: an outage can go unnoticed for up to about an hour; UptimeRobot (5 min, free) is the fallback,
described in guide 12.

## Consequences
- Artifacts hold password hashes and visitor ips: anyone with repo access can download them. That is the two
  owners today; adding a collaborator gives them this data too.
- Restoring is manual and documented in guide 12. The server refuses to start on a corrupt data file, so a bad
  write never silently overwrites the backup source.
- GitHub disables scheduled workflows after 60 days without repo activity; re-enable them under Actions.
