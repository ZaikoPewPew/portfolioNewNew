#!/bin/bash
# Shrink site media without visible loss. Usage: tools/optimize-media.sh assets/foo.png assets/bar.mp4 ...
#   .png → .webp (q90, alpha kept) and every reference in the site's .html files is switched to the .webp
#   .jpg → re-encoded in place at q82, capped at 1280px wide
#   .mp4 → H.264 crf 26, no audio, faststart (moov first, so playback starts before the file is fully loaded)
# Originals are replaced — commit before running so git keeps them.
set -euo pipefail
cd "$(dirname "$0")/.."
kb(){ echo $(( $(stat -f%z "$1") / 1024 ))KB; }

[ $# -eq 0 ] && { echo "usage: tools/optimize-media.sh <file.png|jpg|mp4> ..."; exit 1; }
for f in "$@"; do
  [ -f "$f" ] || { echo "skip $f — no such file"; continue; }
  case "$f" in
    *.png)
      out="${f%.png}.webp"
      cwebp -quiet -q 90 -alpha_q 100 -m 6 -sharp_yuv "$f" -o "$out"
      echo "$f $(kb "$f") → $out $(kb "$out")"
      name=$(basename "$f"); grep -rl --include='*.html' --exclude-dir=.git --exclude-dir=_src "$name" . \
        | xargs -r sed -i '' "s/${name//./\\.}/$(basename "$out")/g"
      rm "$f" ;;
    *.jpg|*.jpeg)
      before=$(kb "$f")
      magick "$f" -resize '1280x>' -strip -sampling-factor 4:2:0 -quality 82 "$f"
      echo "$f $before → $(kb "$f")" ;;
    *.mp4)
      tmp="${f%.mp4}.tmp.mp4"; before=$(kb "$f")
      ffmpeg -v error -y -i "$f" -an -c:v libx264 -preset veryslow -crf 26 -pix_fmt yuv420p -movflags +faststart ${VF:+-vf "$VF"} "$tmp"
      mv "$tmp" "$f"; echo "$f $before → $(kb "$f")" ;;
    *) echo "skip $f" ;;
  esac
done
