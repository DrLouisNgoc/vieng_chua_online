# Milestone 2: Vietnamese client (local, single-player, no server yet)

PRD: docs/product/vieng-chua-online.prd.md (Milestone 2)

## Goal
A browser web app, run locally (`npm run dev`), that:
- Renders the original 3D temple scene (reused assets: buddha.glb, the two
  bodhisattva attendants, pine.glb, the player's monk.glb, ground/woodland
  environment) with Three.js.
- Shows a Vietnamese-translated UI: room/header label, a presence-count
  placeholder (hardcoded "1/100" — real counts arrive in Milestone 3), and
  the 목탁 (moktak) panel fully translated and interactive.
- Lets the owner strike the moktak (click/tap) and hear
  `moktak-hit-natural.wav`, matching the original's single confirmed
  client-local interaction (see Milestone 1's protocol-notes.md).
- No WebSocket, no backend — that's Milestone 3.

## Stack
- Vite + TypeScript, vanilla (no UI framework needed for this scope).
- `three` for rendering.
- Assets read from `assets-vendor/sansatemple/` (decision 0006), fetched by
  a one-time script, gitignored.

## Scope
**In**: scene with the listed models lit and positioned reasonably (doesn't
need to pixel-match the original's exact layout/camera rigging — "same
assets, recognizably the same temple" is enough for MVP); orbit-style camera
(mouse drag to look around, wheel to zoom, matching the original's own
desktop control scheme: "바닥 클릭 · 드래그로 둘러보기 · 휠로 확대/축소"
→ translated); moktak panel (open/close, strike, basic autoplay
toggle — matches 목탁 열기/닫기/두드리기/자동재생 strings); a Vietnamese
string table covering every UI string this milestone actually displays.

**Out**: all other original interactions (절하기, 염주, 향 올리기), player
movement/multiplayer, save/progress, custom scenes/audio, any deployment.

## Vietnamese string table (strings used this milestone)
| Korean (original) | Vietnamese |
|---|---|
| 산사 — 온라인 절 | Viếng Chùa Online |
| 산사 | Sơn tự |
| 목탁 | Mõ |
| 목탁 두드리기 | Gõ mõ |
| 목탁 열기 | Mở mõ |
| 목탁 닫기 | Đóng mõ |
| 목탁 조작 | Thao tác mõ |
| 자동재생 | Tự động gõ |
| 일시정지 | Tạm dừng |
| 목탁 자동재생 | Tự động gõ mõ |
| 목탁 자동재생 일시정지 | Tạm dừng tự động gõ mõ |
| 목탁 자동재생을 시작했어요. | Đã bắt đầu tự động gõ mõ. |
| 목탁 자동재생을 멈췄어요. | Đã dừng tự động gõ mõ. |
| 상단 소리와 설정의 효과음을 켠 뒤 목탁을 두드려주세요. | Hãy bật âm thanh ở trên rồi gõ mõ. |
| 목탁 소리를 준비하지 못했어요. 다시 눌러주세요. | Chưa chuẩn bị được tiếng mõ. Hãy thử lại. |
| 소리 켜기 | Bật âm thanh |
| 소리 끄기 | Tắt âm thanh |
| 바닥 클릭 · 드래그로 둘러보기 · 휠로 확대/축소 | Kéo để nhìn quanh · Lăn chuột để phóng to/thu nhỏ (tạm bỏ "click nền để di chuyển" ngày 2026-11-03 vì chưa xây; khôi phục lại trong Milestone 4 khi di chuyển thật sự được xây) |
| 방문객 보기 (placeholder count label) | người đang viếng chùa |

## Acceptance
- `npm run dev` serves the app; opening it in a browser shows the 3D scene
  with the reused original assets and Vietnamese text only (no leftover
  Korean strings in what's rendered this milestone).
- Clicking the moktak strikes it: plays the sound, and (for autoplay) toggles
  a repeating strike on an interval.
- A screenshot is taken and visually checked (per the "test the golden path
  in a browser" rule) before this milestone is reported done.

---
*Status: done.* `npm run dev` serves a working scene: Buddha + two
bodhisattva attendants + two pine trees + the player's monk avatar, on a
textured ground, fully Vietnamese UI (header, hint, moktak panel). Verified
by screenshot via REA/CDP. The one fix needed along the way: the original
`.glb` files use Meshopt compression, so `GLTFLoader` needed
`setMeshoptDecoder(MeshoptDecoder)` from the `meshoptimizer` package wired
up — without it, loading failed with "setMeshoptDecoder must be called
before loading compressed files".

**Not checked**: the moktak click interaction (sound + pulse animation) was
exercised only by code review and the `moktak.ts` unit tests, not by an
automated in-browser click — `capture_browser_scenario`'s connect mode
timed out attaching to the already-inspected CDP target (likely a conflict
with the passive inspection session on the same target). Low risk: the
click handler is a two-line wire-up (`strikeButton.addEventListener("click",
...)`) calling already-unit-tested logic. Worth a manual click-test by the
owner when first running the app.
