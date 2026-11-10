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

## Follow-up: pháp danh locked per ip

Owner: "giờ vào mỗi người sẽ phải để 1 pháp danh, hoặc tên riêng, trùng
với ip của họ vào! và họ chỉ được dùng 1 pháp danh này ko được để pháp
danh mặc định là thiện tâm nữa" (each visitor must now give a pháp danh
or their own name, tied to their ip, and may only ever use that one —
the old generic default "Thiện Tâm" is no longer allowed).

- `server/src/visitorNames.ts` (new): `isDefaultName()` (normalizes
  case/diacritics so "thien tam" also matches) and
  `createVisitorNameStore()` (ip -> pháp danh, persisted to a new
  `data/visitor-names.json`, same pattern as boards.json).
- `server/src/server.ts`: on connect, sends `{type:"name-lock", name}`
  (the ip's already-registered name, or `null`) before any join. On
  `join`: if the ip has a lock, the visitor is joined under that locked
  name regardless of what they sent (defense in depth — the normal UI
  never offers a different name once locked); if not, a first-time
  `join` with the forbidden default name is refused
  (`{type:"join-refused", reason:"default-name"}`) instead of
  registering it.
- `app/src/onboarding.ts`: starts with an empty name (no more
  `DEFAULT_NAME` prefill); `isValid` now also rejects the default name;
  new `lockName()`/`isNameLocked` so the field can be frozen once the
  server reports a lock.
- `app/src/main.ts`: the name field is prefilled and set `readOnly` on
  `onNameLock`; entering the temple (hiding onboarding, showing the HUD)
  now happens on `onWelcome` instead of synchronously on submit, since a
  submit can be refused; `onJoinRefused` shows an inline error and keeps
  the form open.

Ruling: a visitor's ip is read from `X-Forwarded-For` (Caddy sets this
automatically when reverse-proxying — docs/for-owner/huong_dan/09-cau-hinh
-caddy.md), falling back to the raw socket address only when that header
is absent (local dev, no proxy). Using the raw socket address alone
would have been wrong in production: behind Caddy, every real visitor's
raw address as seen by the Node server is Caddy's own address, which
would have collapsed every visitor into one shared lock. Cost if wrong:
the whole feature would silently do nothing in production (everyone
sharing one locked name) while still working in local testing — checked
this specifically against the Caddy config before writing it.

Ruling: ip-based locking means everyone behind the same router/NAT
(a household on shared WiFi) gets forced onto one shared pháp danh —
a known, accepted limitation of identifying people by ip with no
accounts, not something fixable without adding logins. Flagged here
rather than silently shipped.

## Follow-up: the bell also tolls on its own, every hour

Owner: "sau 2 việc trên, làm cho tôi phần là âm thanh chuông tự động
đánh, ! cứ 1 tiếng đánh 1 lần !" (after the two things above, make the
bell sound ring on its own, once every hour).

- `server/src/server.ts`: a second `setInterval` (alongside the
  existing visitor-state tick) broadcasts the same `{type:"bell"}`
  message the join-bell already used, once an hour
  (`DEFAULT_BELL_INTERVAL_MS`). No client or protocol change — the
  existing `onBell` → `ambience.ringBell()` wiring from earlier in this
  milestone already handles any `"bell"` message the same way, whatever
  triggered it.
- `startPresenceServer()` grew a 4th parameter, the interval in ms,
  defaulting to one hour; tests pass a short one (50ms) to observe
  several tolls inside the test's own timeout instead of waiting an
  hour for real.

## Verified

App 254 + server 139 tests pass; `npx tsc --noEmit -p .` clean in both.
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

Pháp danh lock, live in the running dev app: submitting the forbidden
default name showed the inline error and stayed on the onboarding
screen; submitting a real name entered the temple normally; reloading
the page afterward showed the name field prefilled and `readOnly` with
that same name (confirmed via the DOM, not just the visible text);
restarting the dev server and reloading again still showed it locked
(persistence to `data/visitor-names.json` survives a restart).

## Not checked

- The plaque's actual in-world look (position, facing, whether it
  clips a pillar) — only confirmed the scene loads without error.
- Whether `bell-gong.mp3` actually sounds right once the owner adds it
  (still silent/placeholder in this session, same as the other two
  optional sounds) — now also what the hourly auto-toll will actually
  sound like once that file exists.
- Mobile/narrow-viewport layout for the new header button and the
  longer boards-panel forms.
- Whether an unmuted YouTube iframe autoplay actually gets through on
  every real browser the owner's family might use — the toggle-click
  approach is the standard workaround, but browser policies vary.
- The hourly bell's real 1-hour cadence was not watched live for an
  hour — verified instead with a short interval in a server test and by
  reading the `setInterval` code; the join-triggered bell (same
  broadcast path) was confirmed live.
- What happens to a visitor's lock if their isp/router gives them a new
  ip later (mobile networks especially) — they'd be treated as a new,
  unlocked visitor; not something this session was asked to solve.

## Follow-up: Đọc Kinh Nikaya (a daily-rotating sutta reading list)

Owner: "tạo thêm 1 chỗ để đọc kinh nikaya, sau đó mỗi ngày sẽ tự động
hiện lên 1 bài kinh hay!" — then, source: "đây nguồn nikaya từ đây,
trung bộ kinh" (budsas.org's Trung Bộ Kinh / Majjhima Nikaya section).
Interviewed: content is the owner's own entries, same as every other
cốc, not this app's.

Ruling: the board stores a title + a link to read on its source site
(reusing the exact "Tên | link" format `Talk`/`parseTalks` already use
for bài giảng), never the sutta's own translated text. budsas.org's
Trung Bộ Kinh translation (HT Thích Minh Châu) and its English/Vietnamese
summaries (Bhikkhu Bodhi / Ni sư Trí Hải) are copyrighted works, distinct
from the ancient Pali canon itself — copying them into this app's own
data would reproduce someone else's copyrighted translation, not just
reference a public-domain scripture. Visitors click through to read the
full text on the source site itself, same as how the bài giảng board
links out to YouTube instead of hosting its own copy of a talk.

Looked for a clean, scrapable "152 suttas -> individual page" index on
budsas.org to pre-fill a starter list; the site's own table-of-contents
page for Trung Bộ Kinh is a mix of commentary links (not a clean
per-sutta list) and its summary page is one long page of copyrighted
summary text with no per-sutta links extractable without touching that
text. Left the board empty rather than risk scraping it wrong — the
owner (or a later session, with the owner picking the exact
title/link pairs) fills it in via the board's own password-gated edit
form, same as every other cốc.

- `server/src/boards.ts`: new seed `doc-kinh`, title "Đọc Kinh Nikaya",
  `type: "text"`, no special fields — reuses the existing board
  store/edit/password flow entirely.
- `app/src/boards-client.ts`: `sutraOfTheDay(talks, now?)` — picks the
  same `Talk` for every visitor on a given local calendar day
  (`Date.UTC` from local y/m/d, so it changes at local midnight),
  cycling through the list; pure, tested (same-day stability,
  next-day change, empty-list → null).
- `app/src/boards-panel.ts`: `doc-kinh` is special-cased by id (like the
  hall projector/chánh điện boards already are) to a dedicated renderer
  — "Hôm nay:" (today's pick, a link) + a browsable list of the rest
  (picking one just changes what's shown locally, never which one is
  "today's" for anyone else). No "hỏi pháp"/"bài giảng" UI (no occupant
  to answer, not a talk list) — excluded the same way the hall
  projector/chánh điện boards already are.
- `app/src/temple-layout.ts` / `board-proximity.ts`: a new spot
  (`SUTRA_SPOT`) right beside the existing meditation hut (`HUT`,
  untouched/no new geometry) so walking up there prompts "Nhấn E" like
  every other board; it's also always reachable from the "Cốc & Bài
  giảng" list regardless of location, same as every other board.

Verified: app 258 tests pass (tsc clean); board appears in the list and
proximity spot resolves correctly (`board-proximity.test.ts`); opened
the board live in the running dev app and confirmed the empty-state
message and edit form placeholder render correctly. Did not verify the
"Hôm nay" rendering with real content live (no real entries to test
with yet — `sutraOfTheDay`/the render path are covered by unit tests
instead).

## Follow-up: hall brightness, pháp cú text, a sign, and reading inline

Owner (after seeing the hall in-game): "TÔI MUỐN CHÁNH ĐIỆN SÁNG TRƯNG
HƠN NỮA VÀ THÊM VÀI CÂU KINH PHÁP CÚ CHO TÔI", then (after seeing the
doc-kinh cốc): "TRƯỚC CỬA CỐC NÀY CÓ GHI PHÒNG ĐỌC KINH NYKIA, VÀ CODE
THÊM MỞ KINH NHƯ TRANG GIẤY CHỚ ĐỪNG CHUYỂN LINK SANG LINK KHÁC".

- `temple-grounds.ts`: `buildHallAmbientLights()` — 4 ceiling fill
  lights over the cushion area (the altar's own lights, `buildShrine`,
  don't reach past it); kept to 4 (not one per inner pillar, which would
  be 16) to avoid a real light-count/frame-rate cost.
- Ruling: the "pháp cú" quotes are this app's own short original
  Vietnamese lines, not a copy of any specific published Pháp Cú
  translation — a named translator's rendering is copyrighted
  separately from the ancient, public-domain Pali verses themselves
  (same reasoning as the doc-kinh board above).
  `quoteTextTexture()`/`setPhapCuText()` draw a short line directly on
  the chánh điện plaque (word-wrapped canvas text, same look as the
  existing placeholder); `main.ts`'s `FALLBACK_PHAP_CU_QUOTES` (4 lines)
  rotate on it until the owner adds real quote photos, which still take
  priority once present (unchanged behaviour).
- A small sign ("Phòng Đọc Kinh Nikaya", plain label — not scripture
  text) now stands at the meditation hut's own door, right at
  `SUTRA_SPOT`; doesn't rename the hut itself (still `coc-thien`,
  sitting meditation).
- `boards-panel.ts`'s sutra reader now shows the linked page inline in
  an `<iframe>` ("mở kinh như trang giấy, đừng chuyển link sang link
  khác" — don't navigate the app away to read it) instead of a plain
  outbound link; a small "Mở trang gốc ↗" link underneath still opens a
  new tab, as a fallback for a source site that refuses to be framed
  (not tested against budsas.org specifically — no real links entered
  yet to try).

Verified: app tests + tsc clean (temple-grounds.test.ts's smoke build
still passes with the new lights/sign). Did not verify the brighter
hall or the new sign by walking there in the browser this session
(ran out of a clean way to drive WASD movement via the browser-pane
automation) — only confirmed the scene builds without error and the
light/sign code matches the existing patterns used elsewhere in this
file. Worth a screenshot check before the owner relies on exact
brightness/sign placement looking right.
