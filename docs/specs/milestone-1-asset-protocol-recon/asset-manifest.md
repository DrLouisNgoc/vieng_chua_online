# Asset manifest (from static recon of game-YRnjQJx2.js)

Source: `https://sansatemple.com/assets/game-YRnjQJx2.js` (and `index-*.js`),
fetched 2026-11-02. Found by grepping the minified bundle for string
literals — not a full runtime capture, so some assets loaded only on
interaction may be missing. All paths are relative to
`https://sansatemple.com/`.

## 3D models (.glb)
- `/assets/models/buddha.glb` — main altar Buddha statue
- `/assets/models/mahastamaprapta.glb` — 대세지보살 (Mahāsthāmaprāpta attendant)
- `/assets/models/avalokitesvara.glb` — 관세음보살 (Avalokiteśvara attendant)
- `/assets/models/pine.glb` — pine tree (scenery)
- `/assets/monk.glb` — player/visitor character model (full)
- `/assets/monk-remote-lod.glb` — lower-detail version, used for remote
  visitors (other players)

## PBR material textures (color/normal/roughness triplets)
- `/assets/materials/cloth/{color,normal,roughness}.jpg`
- `/assets/materials/ground/{color,normal,roughness}.jpg`
- `/assets/materials/plaster/{color,normal,roughness}.jpg`
- `/assets/materials/rock/{color,normal,roughness}.jpg`
- `/assets/materials/roof/{color,normal,roughness}.jpg`
- `/assets/materials/stone/{color,normal,roughness}.jpg`
- `/assets/materials/wood/{color,normal,roughness}.jpg`

## Other images
- `/assets/moktak-7FyZzEKd.webp` — moktak (wooden gong) sprite/icon
- `/assets/altar-devotion.jpg`
- `/assets/environment/woodland.jpg` — skybox/environment background
- `/assets/altar-wall-calm-20261102.jpg` — main hero/background image (dated
  filename — the site appears to rotate this asset periodically)
- `/assets/kakaopay-support-*.jpg` — **donation QR code image — excluded,
  see note below**
- `/assets/buymeacoffee-logo-*.svg` — **donation button asset — excluded**

## Audio
- `/audio/heart-sutra-v1.mp3` — 반야심경 (Heart Sutra) chant
- `/audio/temple-chant-review-v1.mp3` — labeled "검토용" (review/draft) in
  code; two chant variants are named in UI strings: "새벽 예불" (dawn
  service) and "저녁 예불" (evening service) — likely more chant files load
  dynamically; not all were observed statically.
- `./audio/moktak-hit-natural.wav` — single moktak strike sound
- Background ambience options named in UI (files not yet located): "고요한
  산새" (quiet mountain birds), "느긋한 솔잎" (unhurried pine needles),
  "따스한 물결" (warm waves), "은은한 바람" (soft wind) — these back the
  "환경음 · 바람과 새소리" (ambient sound) setting.

## Fonts / stylesheets
- `/fonts/SansaQuietUI-Core.woff2` — custom UI typeface
- `/assets/game-CXqKEmtK.css` — UI stylesheet

## Excluded from the clone entirely (not just deferred)
- `kakaopay-support-*.jpg`, `buymeacoffee-logo-*.svg`, and the donation-box
  (복전함) UI flow — the original embeds the real developer's personal bank
  account number (토스뱅크, account ending 4757) and a personal KakaoPay QR.
  None of this belongs in a personal clone; it is not being extracted,
  translated, or referenced anywhere in this project.

## Not yet found (needs a fuller runtime capture, not just static grep)
- Exact ambient-sound audio file URLs (4 named options above).
- Any additional chant audio variants beyond the two `.mp3` files found.
- Whether `.glb` models embed textures or reference the PBR material set
  above externally (affects how they're reused).
