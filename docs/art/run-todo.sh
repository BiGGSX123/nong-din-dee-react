#!/bin/sh
# Generates every prompt in prompts/todo/ (name format: <folder>__<file>.txt)
# into docs/art/out/<folder>/<file>.png. Needs GEMINI_API_KEY in the environment.
# usage (from the repo root):  sh docs/art/run-todo.sh
set -e
ART=docs/art
run() {
  f="$1"; b=$(basename "$f" .txt); cat=${b%%__*}; name=${b#*__}
  mkdir -p "$ART/out/$cat"; out="$ART/out/$cat/$name.png"
  [ -f "$out" ] && { echo "skip $out"; return; }
  case $cat in
    mascot) extra="--ref public/mascot/nong-din-dee.webp --cutout";;
    bg) extra="--ref public/bg/map-bg.webp --aspect 9:16";;
    *) extra="--cutout";;
  esac
  python3 "$ART/gen.py" --prompt-file "$f" --out "$out" $extra
}
for f in "$ART"/prompts/todo/*.txt; do run "$f" & while [ "$(jobs -r | wc -l)" -ge 6 ]; do sleep 1; done; done
wait
