# Architecture

Read this instead of exploring the code. Then open only the files the task needs.
**Rule:** when a PR adds, removes, renames a source file or changes what it owns, update its line here in the
same PR. `npm run check:docs` fails if a source file has no line here or a listed path does not exist.

## Shape
```
browser (app/, Vite + Three.js)  --WebSocket /ws-->  server/ (Node, ws)     -- data/visitor-names.json
                                 --HTTP /boards, /admin-->  same process   -- data/boards.json
```
- Production: `https://chua.io.vn`. Caddy serves `app/dist` and proxies `/ws*`, `/boards*`, `/admin*` to the
  server on :8787 (systemd `chua-server`). Deploy: merge to `main` → CI → `/opt/chua/deploy.sh`
  (`docs/for-owner/huong_dan/11-cap-nhat-deploy-lai.md`).
- Scheduled workflows: `backup.yml` (nightly `server/data/` → VPS + 90-day artifact), `uptime.yml` (hourly),
  `audit.yml` (weekly); Dependabot weekly. Why: decision 0013.
- Build-time env: `VITE_PRESENCE_URL`, `VITE_BOARDS_URL`; unset → same origin (`app/src/runtime-urls.ts`).
- Gitignored, never in git: `app/public/sansatemple/` (original assets, `scripts/fetch-sansatemple-assets.sh`),
  `app/public/thirdparty/` (licensed assets, `docs/assets/third-party-assets.md`), `server/data/` (real content).
- **One copy of the rules both sides must agree on**: `shared/protocol.ts` — `MAX_NAME_LENGTH`, `MAX_CHAT_LENGTH`,
  `ROBE_COLOR_COUNT`, `SEAT_COUNT`, `WORLD_LIMIT`, `ACTIVITIES`, `isDefaultName()`. App imports
  `../../shared/protocol`, server `../../shared/protocol.js`. Message *shapes* are still written on both sides
  (`server/src/protocol.ts`, `app/src/visitor-protocol.ts`); `app/src/shared-protocol.test.ts` pins the seat
  layout and robe palette to the shared numbers.

## shared
| File | Owns |
|---|---|
| `shared/protocol.ts` | Constants and the default-name rule used by both app and server (pure, no imports) |

## server/src
| File | Owns |
|---|---|
| `server/src/server.ts` | Entry point: HTTP server + WebSocketServer on one port, connection cap, rate limit, Origin check, join/chat/state routing, bell every 30 min, graceful SIGTERM shutdown |
| `server/src/protocol.ts` | Client→server message types and strict parsing (everything a client sends is untrusted) |
| `server/src/presence-room.ts` | Connected-visitor count and ids |
| `server/src/visitor-room.ts` | Joined visitors' latest state, seat ownership, dirty flag for the 10 Hz broadcast |
| `server/src/visitor-names.ts` | Pháp danh locked per ip; `isDefaultName()` |
| `server/src/chat-room.ts` | Public chat ring buffer (50 messages) |
| `server/src/boards.ts` | Board store (cốc, hall projector, quote plaque, Đọc Kinh Nikaya): seeds, edit, register/approve, hỏi pháp questions/answers |
| `server/src/boards-persisted.ts` | Reading `boards.json`: validates the persisted (possibly older) shape and `mergeWithSeed()` with the current seeds |
| `server/src/boards-http.ts` | HTTP routes for boards and the admin panel (no framework); per-ip write cap and wrong-password lockout (429) |
| `server/src/client-ip.ts` | The real visitor ip behind Caddy (first `X-Forwarded-For` entry) — used for every per-ip rule |
| `server/src/bell-schedule.ts` | `msUntilNextBoundary()` — aligns the bell (every 30 min) to the wall clock instead of server start time |
| `server/src/rate-limit.ts` | Fixed-window hit counter per key, prunes expired keys |
| `server/src/boards-file.ts` | JSON read/write for `data/*.json`: atomic writes (temp + rename); missing file → null, corrupt file → throws |
| `server/src/admin-auth.ts` | One admin password, set on first login |
| `server/src/password-hash.ts` | scrypt hash/verify shared by boards and admin |

## app/src — entry and wiring
| File | Owns |
|---|---|
| `app/src/main.ts` | Entry: renders the page shell, onboarding → join, wires scene, presence, panels |
| `app/src/scene.ts` | Renderer, sky/fog/sun, model loading, input, camera, walk animation, render loop (to be split) |
| `app/src/runtime-urls.ts` | Default presence/boards URLs when no `VITE_*_URL` is set |
| `app/src/i18n.ts` | Vietnamese string table, keyed by the original Korean UI strings |
| `app/src/browser-storage.ts` | localStorage access that never throws |
| `app/src/style.css` | All styles, sectioned by comments (to be split) |

## app/src — the temple (3D)
| File | Owns |
|---|---|
| `app/src/temple-layout.ts` | Pure plan: sizes and positions of hall, stairs, yard, gate, pond, trees, seats; colliders; `groundHeightAt`. Change sizes here |
| `app/src/temple-grounds.ts` | All procedural meshes, interior lights, koi animation, camera blockers (1491 lines, to be split) |
| `app/src/curved-roof.ts` | Vietnamese curved hip roof as raw vertex data |
| `app/src/pagoda-layout.ts` | Where the pagoda complex stands (`PAGODA`, `PAGODA_PLAZA`) and its solid parts as colliders (wall with its gate gap, stupa, towers, shrines, and the hollow hall: walls, door, columns, altar), the hall's platform height and lamp spots; numbers mirror `scripts/blender/pagoda.py` |
| `app/src/statue-copy.ts` | A second copy of the temple's Buddha (shared geometry) stood at a given spot, height and heading: the statue in the pagoda complex's hall |
| `app/src/pagoda-model.ts` | Loads `app/public/models/pagoda.glb` (Shwedagon-style gold pagoda with its own wall, gate and chánh điện, far scenery east of the wall; spot in `PAGODA`), fog off; no file → no pagoda |
| `app/src/coc-model.ts` | The 8 cốc and the meditation hut (no title → no nameplate, 3.2 m) in the pagoda's Myanmar style: shape from `app/public/models/coc.glb`, plus the renamable nameplate and the small lamp; old wooden hut if the file is missing |
| `app/src/terrain-layout.ts` | `WALK_AREA`, the rectangle of walkable land, and four slabs beyond it that end the walk (mountains and river lie outside) |
| `app/src/waterfall.ts` | Animates the terrain's waterfalls: flowing water texture on the `waterfall` ribbon, drifting mist sprites at the `spray` spots; returns the per-frame update |
| `app/src/clouds.ts` | Soft cloud puffs on a ring round the mountains, turning slowly, dimmed at night (sprites, fog off) |
| `app/src/terrain-model.ts` | Loads `app/public/models/terrain.glb`: foothills, a river ring and snow-capped mountains all round the walkable land, fog off; no file → no mountains |
| `app/src/temple-structure-model.ts` | Loads `gate.glb` (tam quan: red pillars, three-tier teal roof; the SƠN TỰ plaque stays code), `bell-tower.glb` (pavilion with a Burmese bell), `hall-body.glb` (the hall's three walls, all pillars and front beam) and `perimeter-wall.glb` (pilasters, tiled cap) built in world coordinates by `scripts/blender/temple.py`; a missing file → the old procedural walls |
| `app/src/hall-roof-model.ts` | The main hall's Myanmar-style roof (3 teal tiers, gold spire) from `app/public/models/hall-roof.glb`, placed on the hall's roof line; old curved roof if the file is missing |
| `app/src/lantern-model.ts` | Red paper lanterns: shape from `app/public/models/lantern.glb` (3 named parts), 3 instanced draw calls; plain-ball fallback if the file is missing |
| `app/src/simplify-geometry.ts` | meshoptimizer simplification (used on pine.glb) |
| `app/src/sky-cycle.ts` | Sky, sun and fog for the local hour (`?gio=HH` previews an hour) |
| `app/src/collision.ts` | Point-in-box test and sliding move resolution against layout boxes |

## app/src — the visitor's own avatar
| File | Owns |
|---|---|
| `app/src/onboarding.ts` | Onboarding form state: name rules, locked pháp danh, gender, robe colour |
| `app/src/avatar-svg.ts` | Parametric SVG avatar for the onboarding preview |
| `app/src/monk-model.ts` | The avatar file: `app/public/models/monk-nam-tong.glb` (our own Nam tông novice, same 17 bones), falling back to the original `monk.glb` when it is missing |
| `app/src/avatar-look.ts` | Robe tint and name label as seen by others |
| `app/src/avatar-rig.ts` | Poses one monk.glb instance from a pose |
| `app/src/body-pose.ts` | monk.glb bone names and pose maths (offsets from rest) |
| `app/src/pose-for-activity.ts` | Pose for each activity (seated, bowing, greeting…) |
| `app/src/walk-cycle.ts` | Walk-cycle leg/arm swing |
| `app/src/movement.ts` | Camera-relative WASD movement, run, snap to a seat |
| `app/src/key-state.ts` | Held keys by `KeyboardEvent.code` |
| `app/src/third-person-camera.ts` | Follow camera as pure functions |
| `app/src/held-props.ts` | Broom and bead string placed at the hands |

## app/src — interactions and practice
| File | Owns |
|---|---|
| `app/src/interaction-state.ts` | What the visitor is doing: one pure state machine |
| `app/src/interaction-targets.ts` | Nearby seats/props the visitor can use (minus seats others hold) |
| `app/src/interaction-prompts.ts` | Prompt texts and keys for the offered actions |
| `app/src/interaction-runtime.ts` | Wires input → state → scene for interactions |
| `app/src/interaction-props.ts` | Meshes for broom, fallen leaves, beads |
| `app/src/interaction-hud.ts` | Prompt bar and bead counter DOM |
| `app/src/leaf-field.ts` | Fallen leaves and sweeping |
| `app/src/bead-counter.ts` | 108-bead round and lifetime total |
| `app/src/moktak.ts` | Moktak strike counter + `onStrike` callback |
| `app/src/beat-clock.ts` | Frame time → beats at a tempo |
| `app/src/chant-session.ts` | Steps through a chant one syllable per beat |
| `app/src/chant-texts.ts` | The chant texts |
| `app/src/practice.ts` | "Tu tập" controller: chanting on the moktak beat |
| `app/src/practice-panel.ts` | "Tu tập" panel DOM |
| `app/src/ambience.ts` | Background sound and bells from optional files |
| `app/src/background-music.ts` | Hidden YouTube embed for background music, mute toggle |
| `app/src/bell-video.ts` | Hidden YouTube embed for the bell toll; `ring()` restarts it on each toll |

## app/src — multiplayer, boards, chat
| File | Owns |
|---|---|
| `app/src/visitor-protocol.ts` | Client side of the protocol: message types and parsing of server messages |
| `app/src/presence.ts` | WebSocket client: connect, join, send state, receive visitors/chat/bell |
| `app/src/remote-visitors.ts` | Other visitors' tinted avatars |
| `app/src/remote-motion.ts` | Smoothing between the server's 10 Hz updates |
| `app/src/chat-panel.ts` | Public chat DOM |
| `app/src/board-proximity.ts` | Which cốc/projector is within reach |
| `app/src/boards-client.ts` | fetch wrapper for the boards HTTP API |
| `app/src/boards-panel.ts` | Boards panel DOM: list, board, admin views (580 lines, to be split) |
| `app/src/pdf-reader.ts` | Đọc Kinh Nikaya's PDF book, rendered one page at a time via pdfjs-dist |

## Tests
Next to the file: `x.ts` → `x.test.ts` (Vitest). Pure modules are unit-tested; DOM-only panels
(`*-panel.ts`, `interaction-hud.ts`) are not. `app/src/temple-grounds.test.ts` builds the whole grounds in Node.
`server/src/server.test.ts` opens real sockets and fakes ips with `X-Forwarded-For`.

## Other folders
- `scripts/dev.mjs` — `npm run dev`: server on :8787 + Vite on :5173. `scripts/check-docs.mjs` — docs check. `scripts/check-size.mjs` — files over 400 lines.
  `scripts/check-suppressions.mjs` — lint baseline may only shrink. `scripts/claude-format.mjs` — Claude edit hook.
  Root `package.json`: dev tools only (decision 0017) — Prettier, ESLint, oxlint, Stylelint, knip, lefthook; configs
  `.prettierrc.json`, `eslint.config.mjs`, `.oxlintrc.json`, `.stylelintrc.json`, `knip.json`, `lefthook.yml`.
- `scripts/blender/lantern.py` — builds `app/public/models/lantern.glb` (committed, our own model): run
  `blender -b -P scripts/blender/lantern.py -- <out.glb> [<preview.png>]` (Blender 5.x, headless).
  `scripts/blender/pagoda.py` — same for `pagoda.glb` (one meshopt-compressed mesh, ~70k triangles, 10 materials; plaza, wall + gate, hollow chánh điện; the statue in it is the temple's own, copied at runtime).
  `scripts/blender/coc.py` — same for `coc.glb` (the Myanmar-style cốc, ~1k triangles, 6 materials).
  `scripts/blender/hall.py` — same for `hall-roof.glb` (the main hall's roof, ~1.2k triangles, 3 materials).
  `scripts/blender/gate_bell.py` — same for `gate.glb` and `bell-tower.glb` (~1.5k and ~1k triangles, local coordinates).
  `scripts/blender/terrain.py` — same for `terrain.glb` (mountains + river + ~6.5k pines + two huge waterfalls and five streams, ~205k triangles, vertex colours; its CX/CZ/HX/HZ repeat `WALK_AREA`).
  `scripts/blender/temple.py` — same for `hall-body.glb` (~17k triangles) and `perimeter-wall.glb` (~7k), in app world coordinates.
  `scripts/blender/nam_tong.py` — same for `monk-nam-tong.glb` (the avatar: own rig, head, saffron robe; ~15k triangles, 4 meshes; nothing taken from sansatemple).
- `docs/memory/` — handoff, decisions, lessons, open questions. `docs/specs/` — milestone 1–10 history
  (read only when the task touches that milestone). `docs/for-owner/` — Vietnamese guides for the owners.
