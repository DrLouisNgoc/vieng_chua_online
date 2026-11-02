#!/usr/bin/env bash
# Re-downloads the original sansatemple.com assets this project reuses
# (decision 0006: gitignored local cache, never committed).
# Source list: docs/specs/milestone-1-asset-protocol-recon/asset-manifest.md
set -euo pipefail
cd "$(dirname "$0")/.."

base="https://sansatemple.com"
out_root="app/public/sansatemple"

dl() {
  local url="$1" out="$out_root/$2"
  mkdir -p "$(dirname "$out")"
  curl -sL -o "$out" "$base$url"
  echo "$(stat -c%s "$out" 2>/dev/null || echo 0) bytes  <-  $url"
}

dl "/assets/models/buddha.glb" models/buddha.glb
dl "/assets/models/mahastamaprapta.glb" models/mahastamaprapta.glb
dl "/assets/models/avalokitesvara.glb" models/avalokitesvara.glb
dl "/assets/models/pine.glb" models/pine.glb
dl "/assets/monk.glb" models/monk.glb
dl "/assets/monk-remote-lod.glb" models/monk-remote-lod.glb

for mat in cloth ground plaster rock roof stone wood; do
  for kind in color normal roughness; do
    dl "/assets/materials/$mat/$kind.jpg" "materials/$mat/$kind.jpg"
  done
done

dl "/assets/environment/woodland.jpg" images/woodland.jpg
dl "/assets/altar-devotion.jpg" images/altar-devotion.jpg
dl "/assets/moktak-7FyZzEKd.webp" images/moktak.webp
dl "/audio/moktak-hit-natural.wav" audio/moktak-hit-natural.wav
dl "/fonts/SansaQuietUI-Core.woff2" fonts/SansaQuietUI-Core.woff2

echo "Done. Assets in $out_root (gitignored)."
