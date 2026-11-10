# Viếng Chùa Online

A Vietnamese virtual temple you visit in the browser. You walk a 3D temple ground as a robed monk avatar, sit on
a cushion, bow, chant to the moktak, sweep leaves, and see other visitors moving in real time. The site also
hosts the dharma talks and Q&A of the teachers who hold a cốc (hermitage) there.

**Live:** https://chua.io.vn

> **Dành cho chủ dự án:** hướng dẫn tiếng Việt nằm ở [`docs/for-owner/huong_dan/`](docs/for-owner/huong_dan/README.md).
> Cách hai người làm chung: [file 13](docs/for-owner/huong_dan/13-lam-viec-2-nguoi.md).

## What it does

| Area | For visitors |
|---|---|
| Onboarding | Choose a pháp danh (Dharma name, locked to your ip after the first visit), gender and robe colour. A live SVG avatar preview updates as you choose |
| The temple | A procedural Vietnamese temple: main hall with curved roof and Shakyamuni statue, tam quan gate, bell tower, lotus pond with koi, banyan, bamboo, lanterns. Day and night follow your local time |
| Movement | WASD to walk relative to the camera, Shift to run, drag to orbit, wheel to zoom. The camera stays out of walls |
| Practice | Sit on any of 388 cushions, bow, greet, count prayer beads (108 per round), chant on the moktak beat, sweep the yard |
| Together | Other visitors appear live with their robe colour and name. Public chat. The temple bell rings when someone arrives, and once an hour |
| Cốc boards | 8 cốc (4 named for their teachers, 4 open for registration), each with its own text and private "hỏi pháp" questions that become public once answered; the named ones also have a talk list. A hall projector for talks, a quote plaque in chánh điện, and "Đọc Kinh Nikaya": one sutta a day, linked to its source |
| Admin | Approve or reject registrations for the open cốc |

## Stack

- **Client** (`app/`): TypeScript, [Three.js](https://threejs.org/), Vite, Vitest. No UI framework: plain DOM.
- **Server** (`server/`): Node 22, TypeScript run with `tsx`, [`ws`](https://github.com/websockets/ws) for the
  live visitors and a small hand-written HTTP API for the boards. No database: state lives in memory, and
  boards and pháp danh locks are saved to JSON files.
- **Hosting**: one Ubuntu VPS. Caddy (automatic HTTPS) serves the built client and proxies the API. The server
  runs as a systemd service. GitHub Actions runs CI and deploys.

```
browser ──HTTPS──▶ Caddy ──┬── /           → app/dist (static files)
                           ├── /ws         ┐
                           ├── /boards*    ├→ Node server :8787 ──▶ server/data/*.json
                           └── /admin*     ┘
```

A map of every source file: [`docs/architecture.md`](docs/architecture.md).

## Repository layout

```
app/        browser client (Vite). src/ holds modules and their *.test.ts files
server/     WebSocket + boards HTTP server. src/ holds modules and their *.test.ts files
scripts/    dev runner, docs check, asset fetch script
docs/       architecture, conventions, memory (decisions, lessons), owner guides, milestone specs
.claude/    shared Claude Code skills (start / finish / refactor a task; run automatically)
.github/    CI and deploy workflows
```

## Getting started

Prerequisites: Node.js 22 (`.nvmrc`), Git. The 3D models, textures and sounds are **not in git**:
- `app/public/sansatemple/`: run `scripts/fetch-sansatemple-assets.sh`, or copy the folder from the other owner.
- `app/public/thirdparty/`: optional licensed files, listed in
  [`docs/assets/third-party-assets.md`](docs/assets/third-party-assets.md).

Without these assets the code still builds and all tests pass; the scene is just missing models.

```bash
npm ci                # repo root: Prettier + ESLint
npm --prefix server ci
npm --prefix app ci
npm run dev        # server on :8787 and the app on http://localhost:5173
npm run check      # typecheck + all tests + lint + docs check (what CI runs)
```

`?gio=HH` on the URL previews any hour of the day/night cycle.

## Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | server | `8787` | HTTP + WebSocket port |
| `ALLOWED_ORIGIN` | server | unset (no check) | Rejects WebSocket connections from other sites. Set to `https://chua.io.vn` in production |
| `VITE_PRESENCE_URL` | app, build time | same origin `/ws` (`ws://localhost:8787` in dev) | WebSocket URL |
| `VITE_BOARDS_URL` | app, build time | same origin (`http://localhost:8787` in dev) | Boards/admin API base URL |

## Data

- `server/data/boards.json`: board content, hỏi pháp Q&A, password hashes (scrypt).
- `server/data/visitor-names.json`: the pháp danh locked to each ip.

Both files are real people's content: they are gitignored and exist only on the server. A nightly workflow backs
them up (14 days on the VPS, 90 days as a private GitHub artifact); restore steps are in
[guide 12](docs/for-owner/huong_dan/12-duy-tri-lau-dai.md). An hourly workflow checks the site is up.
Admin and cốc passwords are set by the first submit. To reset one, clear its hash in `boards.json` and restart.

## How we work

Two owners, each with their own Claude Code, share this repo ([decision 0012](docs/memory/decisions/0012-two-owner-workflow.md)):

An owner just asks for a change in plain words; Claude runs the steps on its own (no commands to type):
1. Before editing (`.claude/skills/bat-dau`): opens or claims a GitHub Issue, creates a branch, writes the test first.
2. When the change is complete (`.claude/skills/xong`): runs `npm run check`, commits, pushes the branch and opens
   a PR.
3. CI runs `server`, `app`, `docs` and `lint`. When all are green, its `automerge` job squash-merges the PR, unless it is a
   draft or labelled `needs-visual-check`, or `main` moved while CI ran. Then it deploys that exact commit to the
   VPS. With the `deploy.sh` from guide 11, a failed health check rolls the deploy back automatically.

`main` is not locked on GitHub ([decision 0014](docs/memory/decisions/0014-limits-instead-of-branch-lock.md)).
The limits in [`CLAUDE.md`](CLAUDE.md) keep both Claudes off it: no direct commits or pushes to `main`, no manual
merges, no force-pushes outside one's own task branch. Coding rules: [`docs/conventions.md`](docs/conventions.md).

## Documentation

| Doc | What |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | One line per source file, data flow, what must match between client and server |
| [`docs/conventions.md`](docs/conventions.md) | Naming, structure, tests, git |
| [`docs/memory/handoff.md`](docs/memory/handoff.md) | Current state and open work |
| [`docs/memory/decisions/`](docs/memory/decisions/) | Why things are the way they are (numbered, never edited) |
| [`docs/memory/lessons.md`](docs/memory/lessons.md) | Gotchas learned the hard way |
| [`docs/product/vieng-chua-online.prd.md`](docs/product/vieng-chua-online.prd.md) | Original product requirements |
| [`docs/for-owner/huong_dan/`](docs/for-owner/huong_dan/README.md) | Step-by-step VPS, deploy and teamwork guides (Vietnamese) |

## Licence and assets

Private project, all rights reserved (`UNLICENSED`). The temple grounds, avatar preview and all code here are
original work. The 3D models and textures fetched into `app/public/sansatemple/` come from sansatemple.com and
are not covered by this repository. The project knowingly serves them on a public site
([decision 0011](docs/memory/decisions/0011-public-deploy-supersedes-0001.md)); replacing them with
owned or licensed assets is open work.
