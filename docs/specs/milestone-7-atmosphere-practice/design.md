# Milestone 7 design

## Modules (app/src)
| File | Kind | Responsibility |
|---|---|---|
| `sky-cycle.ts` | pure | `skyAt(hour)` -> sun direction, sun colour/intensity, hemisphere colours/intensity, sky top/horizon, fog colour, exposure, `night` 0..1. Keyframes 0, 5, 6.5, 9, 12, 16, 18, 19.5, 21 h, interpolated circularly. At night the "sun" is a dim bluish moon high in the sky (keeps shadows sane). |
| `temple-layout.ts` | data | `LANTERNS` (posts beside the stone path + under the hall front eaves), `BELL_REACH`. |
| `temple-grounds.ts` | three | Lantern meshes (emissive red paper + gold cap), 4 fixed PointLights at the hall front; `setNight(level)` scales emissive and light intensity (light count never changes, so no shader recompiles). |
| `interaction-state.ts` | change | `chant()` -> activity `chanting` (from idle/seated/beads, not with the broom); `stopChant()`; moving stops it. |
| `interaction-targets.ts` / `-prompts.ts` | change | `nearBell`; E action `ringBell` ("Thỉnh chuông"), priority broom > bell > bow > sit. |
| `chant-texts.ts` | data | The three texts as lines of syllables. Heart Sutra Hán-Việt typed from memory of the standard liturgy: **owner to proofread**. |
| `chant-session.ts` | pure | Steps one syllable per beat; reports line, syllable, completed count; loops. |
| `beat-clock.ts` | pure | Accumulates time, returns how many beats fell in a frame (tempo in bpm). |
| `practice.ts` | pure-ish | Practice controller: chant selection/start/stop, moktak autoplay, counts (stored with the bead store helper, one key per chant), view for the panel; driven by `update(dt)` each frame. |
| `practice-panel.ts` | DOM | "Tu tập" toggle button + panel (chant picker, start/stop, highlighted line, count, moktak autoplay, background sound). |
| `ambience.ts` | browser | Optional files in `/thirdparty/audio/`: `ambience-countryside.mp3` (loop), `bell-gong.mp3`, `bowl-struck.mp3` (chant start/end). Missing file -> one console warning, silent. |
| server `protocol.ts` | change | `chanting` added to ACTIVITIES (app list mirrors it). |

Tempos: niệm 96 bpm, Tâm Kinh 120 bpm, autoplay 60 bpm. Sky refresh:
lights every frame (cheap), sky gradient texture redrawn when the hour
moves by a minute.

## Rulings
- Milestone numbering: this is 7; the private deploy moves to 8.
- Bell sound is local only (not synced to other visitors).
- Lanterns: 4 real lights; all others glow by emissive only (performance).
- The Tâm Kinh text is not checked against a printed source.
