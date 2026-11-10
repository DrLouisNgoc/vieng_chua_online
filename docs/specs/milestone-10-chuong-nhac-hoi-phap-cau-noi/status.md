# Milestone 10 — chuông, nhạc nền, hỏi pháp, bài giảng theo cốc, câu nói hay

Not in the original plan; owner requested all of this live in one
session (2026-11-10), after Milestone 9's deploy. Built, tested,
verified in the running dev app, then committed and pushed (owner
confirmed each push explicitly — see the log entries for the exact
wording). Later the same session: a real bug on the live site
(`runtime-urls.ts`, see "Follow-up: live boards.json break" below) and a
new "trả lời" (answer) feature for hỏi pháp (see "Follow-up: answering
hỏi pháp questions" below).

## Scope (owner's own words, then the 4-question interview)

- "thêm tính năng, ai vào có 1 hồi chuông cho tôi" — a bell toll when
  anyone enters.
- "các cốc thì có phần ấn vào để hỏi pháp, và xem bài giảng của các vị
  trong cốc" — a way to ask a question in each cốc, and to see the
  talks of the person each cốc belongs to.
- "tôi muốn treo một số câu nói hay của sư phụ trong chánh điện nữa" —
  quotes from Sư Phụ, hung in the main hall; later clarified: "sẽ có
  những bức ảnh có những câu pháp cú, kinh hay" — these are the owner's
  own photos (pictures with pháp cú/sutra lines on them), not text this
  app writes.
- "[youtube link] để bài này làm nhạc tự động phát cho tôi nhé" —
  autoplay this specific song as background music; confirmed "nhạc
  nền nhé".
- Mid-build: "sửa cho tôi 1 tính năng là tôi có thể update các cốc
  trong đó bao gồm tên và nội dung" — also let the owner rename a
  cốc's title, not just its content.

Interviewed (AskUserQuestion) before building, to pin the parts with a
real architectural fork:

| Question | Chosen |
|---|---|
| Who hears the bell? | Everyone currently in the temple (broadcast), not just the one entering |
| Where do "hỏi pháp" questions go? | Private — only the cốc's own password reads them, never public |
| Which cốc get their own "bài giảng" list? | All 4 named cốc (Cô Yến, Anh Tuấn Hà, Sư Nguyên Tuệ, Khánh) — not the 4 open ones |
| How are the chánh điện quote photos managed? | A new password-gated board (like the others), owner/sư phụ edits which files + captions show |

## Rulings (decided without asking, with reasoning)

- **Background music is a YouTube embed, not a downloaded/ripped audio
  file.** Embedding is what YouTube's own embed feature is for; ripping
  audio to self-host would be a real, avoidable copyright exposure on
  top of decision 0011's already-accepted one for the 3D assets. Cost
  if wrong: none — embedding is the conservative choice here, not a
  shortcut.
- **The embed starts muted and only unmutes on a direct click.**
  Browsers block automatic audio with sound; only muted autoplay is
  allowed without a prior gesture. A toggle button's click is itself a
  user gesture, which is usually (not guaranteed, per browser) enough
  to let the sound through on reload-the-iframe-with-mute=0. Cost if
  wrong: the owner has to click once per visit instead of it being
  truly silent-to-sound automatic — unavoidable without that click,
  not a bug.
- **"Hỏi pháp" has no password to ask, only to read.** Anyone should be
  able to leave a question; only the cốc's occupant should read them.
  Matches the existing board model (editing needs a password, nothing
  else does).
- **The chánh điện quote board is a new `BoardType: "image"`, not a
  repurposed text/video board.** Its body is a list of filename |
  caption lines (same shape as the video board's title | url lines),
  parsed client-side (`parseQuoteImages`) and resolved against
  `app/public/thirdparty/phap-cu/<filename>`. The panel shows the list
  as plain text (no visitor-facing "hỏi pháp" or video embed for this
  board — gated on `board.type === "text"`), consistent with: a photo
  banner has no one to answer questions and isn't a talk to watch.
- **`mergeWithSeed`'s validator treats the new `talks`/`questions`
  fields as optional**, so an older `boards.json` (the one already on
  the live `chua.io.vn` deploy) still merges cleanly into the new shape
  instead of being silently dropped by a stricter type check. Cost if
  wrong: real board content on the live site would vanish on the next
  deploy — checked this specifically before writing the validator.

## What changed

- `server/src/protocol.ts`, `app/src/visitor-protocol.ts`: new
  `{type:"bell"}` server message.
- `server/src/server.ts`: broadcasts it to every connected client when
  any client's "join" is accepted.
- `app/src/presence.ts`: new `onBell` callback; `app/src/main.ts` wires
  it to `ambience.ringBell()` (existing Milestone 7 sound helper,
  already handles a missing `bell-gong.mp3` file gracefully).
- `app/src/background-music.ts` (new): `backgroundMusicEmbedUrl` (pure,
  tested) + `createBackgroundMusic` (DOM wiring, untested like
  boards-panel.ts). Wired into `main.ts` + a header toggle button +
  `style.css` (`.music-toggle`, `.background-music__frame`, hidden via
  0x0 size not `display:none` — audio keeps playing either way, this
  is just the existing convention for a visually-hidden element here).
- `server/src/boards.ts`: `StoredBoard`/`PublicBoard` gained `talks:
  string`; `StoredBoard` gained `questions: Question[]`. `edit()` grew
  optional `talks`/`title` params (title only applied if non-empty
  after trim, so a blank save can't wipe the name). New `ask()` /
  `readQuestions()`. `BoardType` grew `"image"`. New seed
  `loi-phap-chanh-dien`. `mergeWithSeed` now keeps a persisted title
  instead of reverting to the seed's (same rule as body already had).
- `server/src/boardsHttp.ts`: `POST /boards/:id/ask`, `POST
  /boards/:id/questions`; `parseEditRequest` grew optional
  `talks`/`title`.
- `app/src/boards-client.ts`: mirrors the above (`ask`, `readQuestions`,
  `parseQuoteImages`, `talks`/`title` on `edit`).
- `app/src/boards-panel.ts`: title input + talks textarea (named cốc
  only) in the edit form; a "Hỏi pháp" form (text boards only); a
  "Xem câu hỏi đã nhận" button (text boards only) that shows the
  questions once the board's password is given; a plain list renderer
  for the image board's configured photos.
- `app/src/temple-grounds.ts`: `buildPhapCuBanner()` — a small plaque
  on the hall's side wall (`setPhapCuImage`), placeholder canvas
  texture until a real photo loads (same pattern as the existing
  `nguyen-tue.jpg` placeholder).
- `app/src/scene.ts`, `app/src/main.ts`: `setPhapCuImage` plumbed
  through; `refreshPhapCuBanner` fetches the board, parses its photo
  list, and rotates through them every 15s (`PHAP_CU_ROTATE_MS`).
- `scripts/dev.mjs`: pins `PORT=8787` for the server child only (bug
  found while verifying in this harness's browser preview — see
  handoff.md's Gotchas).

## Follow-up: live boards.json break

Pushing the above broke every board on the live site, not just the
projector's talk: the deployed build called `http://localhost:8787` for
boards/presence (mixed-content/private-network blocked by the
visitor's browser), because `VITE_BOARDS_URL` was never actually set in
`/opt/chua/deploy.sh` on the VPS — the deploy guide's own earlier fix
(handoff.md's Gotchas, 2026-11-10 morning) only ever reached the
markdown, not the live script. No SSH/credentials to the VPS from this
session to fix deploy.sh directly; owner tried to SSH in themselves and
lost the password mid-session.

Fix, shipped without needing the VPS at all: `app/src/runtime-urls.ts`
(`defaultPresenceUrl`/`defaultBoardsUrl`, pure, tested) — a production
build with no `VITE_*_URL` override now falls back to the page's own
origin (`wss://<host>/ws`, `https://<host>`) instead of `localhost`,
since Caddy already proxies `/ws*`, `/boards*`, `/admin*` on the same
domain. Dev keeps the old `localhost:8787` default (Vite and this app's
server are different ports locally). Self-heals this exact class of
deploy misconfiguration on every future build, whether or not deploy.sh
ever gets fixed.

Verified live after pushing: confirmed via the deployed bundle's own
source (fetched it directly) that the fallback code shipped and ran,
then confirmed the hall projector's talk loaded again in the browser.
Browser/edge caching made this noisy to verify — different reloads
briefly served different bundle hashes; a cache-busting query string
settled it.

## Follow-up: answering hỏi pháp questions

Owner: "cấp riêng tài khoản cho cô Yến/anh Tuấn Hà/sư Nguyên Tuệ khi vào
cốc để trả lời" (give them accounts for when they go into their cốc to
answer). Interviewed: "trả lời" means typing an answer in the app (not
just reading questions, which already worked), and the answer should be
public in that cốc — the asker has no private page to come back to, so
a private-only answer would never reach them.

- `server/src/boards.ts`: `Question` gained `id` (crypto.randomUUID,
  same pattern as ChatEntry) and `answer: string | null`.
  `normalizeQuestion` fills both for questions already on the live site
  from before this change (same backward-compat rule as talks/questions
  earlier in this doc). New `answer(id, password, questionId, answer)`
  store method — same password as edit/readQuestions. `PublicBoard`
  gained `answeredQuestions: AnsweredQuestion[]` (only questions with a
  non-null answer; `toPublic` filters).
- `server/src/boardsHttp.ts`: `POST /boards/:id/answer`.
- `app/src/boards-client.ts` / `boards-panel.ts`: mirrors the above.
  Each unanswered question in the occupant's own "Câu hỏi đã nhận" view
  gets an inline "Trả lời" textarea + button; an already-answered one
  shows the answer instead. A new "Hỏi đáp" section (no password) shows
  every answered pair to any visitor of that cốc.

Ruling: public answer visibility was the owner's explicit choice in the
interview, not a default I picked — recorded here since it changes who
can read what a visitor asked (previously strictly private to the
occupant).

## Verified

App 246 + server 122 tests pass; `npx tsc --noEmit -p .` clean in both.
Live in the running dev app: entering tolled the bell for an
already-present tab too; the music toggle's icon and the iframe's
`mute` query param both flipped on click; opened "Cốc Cô Yến", set its
password, saved new content, asked a question from the form, then read
it back after supplying the password; opened "Lời Pháp Chánh Điện" and
confirmed its edit form's placeholder and empty-state text. Did not
visually confirm the chánh điện plaque's in-world position/orientation
by walking there (lower priority than the already-confirmed
functional/panel behaviour) — worth a screenshot check before the
owner relies on it looking right.

## Not checked

- The plaque's actual in-world look (position, facing, whether it
  clips a pillar) — only confirmed the scene loads without error.
- Whether `bell-gong.mp3` actually sounds right once the owner adds it
  (still silent/placeholder in this session, same as the other two
  optional sounds).
- Mobile/narrow-viewport layout for the new header button and the
  longer boards-panel forms.
- Whether an unmuted YouTube iframe autoplay actually gets through on
  every real browser the owner's family might use — the toggle-click
  approach is the standard workaround, but browser policies vary.
