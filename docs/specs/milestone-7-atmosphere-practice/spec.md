# Milestone 7: day/night, lanterns, chanting, moktak autoplay, sound

Interview with the owner: 2026-11-07, two rounds. Ideas taken from
chuasen.com (closed since 2026-11-06; features known from the 2026-11-03
notes and its closing notice: "niệm Phật, tụng kinh, ngồi thiền") and
from sansatemple.com (moktak autoplay, "자동재생"). Our own code only
(decision 0008); decision 0007's "out unless separately scoped" items
day/night, lanterns and music are now scoped in by the owner.

## Decisions (owner, 2026-11-07)
- F1. Day/night follows the real local clock of the visitor's machine;
  lanterns light up at night.
- F2. Chanting: niệm A Di Đà Phật, niệm Quan Âm, Bát Nhã Tâm Kinh (Hán-Việt
  phiên âm, traditional text, public domain; modern translations are
  copyrighted and not used). No voice recording: the text advances
  syllable by syllable on the moktak beat, with a count.
- F3. Background sound and the bell from CC0 files Claude finds, licence
  checked on the source page, catalogued, and shown to the owner first
  (decision 0009).
- F4. Moktak autoplay (steady beat on/off).
- Not chosen: practice streaks, incense, remembered character, robe styles.

## Scope
**In**: sky colours, sun/moon light and fog from the local hour; red
lanterns along the stone path and the hall front, glowing at night;
"Thỉnh chuông" at the bell tower; a "Tu tập" panel: pick a chant,
start/stop, current line with the current syllable highlighted, counts
kept on this device; moktak autoplay toggle; background sound toggle.
While chanting the avatar joins palms (standing or seated) and others see
it (new `chanting` activity in the visitor protocol); moving stops it.
**Out**: voice chanting audio, synced bell sound for other visitors,
anything needing an account.

## Acceptance criteria
1. At 12:00 the scene is daylight as today; at 21:00 it is night with
   lanterns glowing; dawn/dusk are in between (forced-hour screenshots).
2. Each chant runs syllable by syllable with the moktak, the count grows
   per completed phrase/recitation and survives a reload; moving stops it.
3. Another visitor sees the chanting pose.
4. Moktak autoplay strikes steadily until turned off.
5. Without the audio files nothing breaks (one warning); with them,
   ambience loops and "Thỉnh chuông" rings.
6. Tests + tsc pass (app, server); screenshots 375/1440; render timing
   at night not noticeably worse.
