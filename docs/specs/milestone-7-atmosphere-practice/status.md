# Milestone 7 status

Phase: **built and reviewed** (2026-11-07, gate mode auto). Sound files
pending the owner.

## Log
- 2026-11-07: interview (2 rounds), F1-F4; chuasen.com found closed
  ("tạm dừng hoạt động từ ngày 06/11/2026").
- 2026-11-07: built steps 1-5; CC0 candidates catalogued (step 6).

## Acceptance criteria — evidence (Playwright + system Chrome)
1. Day/night: screenshots at ?gio=12 / 6.5 / 21: noon unchanged, dawn
   warm, night dark blue with red lanterns and warm pools of light.
   Night first looked too dark and the lanterns burnt white; retuned
   (night light 0.6, exposure 1.2, glow 0.9). Pass.
2. Chanting: Tâm Kinh highlights syllable by syllable; A Di Đà counted 2
   phrases in ~8 s at 1440 (1 at 375: frames are capped at 0.1 s, so a
   slow machine chants slower); count kept after reload; W stops it.
   Line wraps at 375 after a fix (syllable spans had no real spaces). Pass.
3. Two visitors: B sees A with palms joined while A chants. Pass.
4. Moktak autoplay toggles on, strikes at 60 bpm (unit tests), disabled
   while chanting. Pass.
5. Without sound files: one warning per file per page load, nothing else
   breaks. With files: **not checked** (owner has not downloaded them).
   "Thỉnh chuông" prompt appears within 4.1 of the bell tower. Pass.
6. app 211 tests, server 44, tsc clean in both; screenshots 375/1440.
   Render timing (60 sync renders): before M7 31.8 / 29.8 ms; M7 noon
   33.8 / 34.1 / 29.0 / 34.0 ms; M7 night 34.2 / 54.2 / 39.3 / 31.2 ms.
   Day roughly unchanged; night a few ms slower and noisier (moon
   direction puts more objects in the shadow pass: 459 vs 379 calls).

## Rulings (decided alone — say if wrong)
- Ruling: this is Milestone 7, private deploy moves to 8 — why: deploy not
  started — cost if wrong: renumber docs.
- Ruling: audio files downloaded by the owner, not by script — why:
  bigsoundbank.com returns 403 to scripted requests; not circumventing it
  — cost if wrong: none.
- Ruling: Freesound not used — why: downloads need a login (red tier) —
  cost if wrong: the owner can provide Freesound files themselves.
- Ruling: `?gio=HH` URL parameter previews any hour — why: lets the owner
  see night during the day; default stays real time — cost if wrong:
  remove one line.
- Ruling: Quán Thế Âm wording "Nam Mô Đại Từ Đại Bi Tầm Thanh Cứu Khổ Cứu
  Nạn Quán Thế Âm Bồ Tát" (as shown in the interview); tempos 96/108/120
  bpm, autoplay 60 — cost if wrong: chant-texts.ts.
- Ruling: chanting offers no E/Q/B prompts; stop from the panel or by
  moving — cost if wrong: one condition.
- Ruling: four real lantern lights exist day and night (intensity 0 by
  day) so shaders never recompile — cost: ~0-4 ms in the day.

## Open problems
- **Tâm Kinh text typed from memory of the standard Hán-Việt liturgy, not
  checked against a printed source — owner to proofread.**
- Sound files not downloaded yet; with-file behaviour unchecked.
- Chant tempo slows on very slow frames (0.1 s cap).
- The bell is heard only by the visitor who rings it.
