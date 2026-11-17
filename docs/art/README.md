# Art pipeline — น้องดินดี "clay toy" redesign

All game art is generated with Gemini from the prompts here — `gen.py` now defaults to the
cheaper `gemini-3.1-flash-image` ("Nano Banana 2"); the shipped soil islands and mascot were made
with the pricier `gemini-3-pro-image` (pass `--model gemini-3-pro-image` to match them exactly),
so every asset shares one look: glossy 3D clay-toy, bright natural colors, Thai setting.

- `prompts/style-bible.txt` — style paragraph prefixed to every prompt
- `prompts/soil/` — prompts used for the shipped soil islands (saline image as style reference)
- `prompts/crops/` — a regenerated "whole plant, no dirt base" crop set. **Not shipped**: the
  original crop art reads better at small sizes, so `public/crops/` keeps the originals
  (converted to WebP, bottom-aligned on a 512 square)
- `prompts/todo/` — **not generated yet** (Gemini prepaid credits ran out on 2026-11-17):
  mascot poses, care/fertilizer/UI icons, quiz/harvest backdrops and the logo
  (the map keeps its original `public/bg/map-bg.webp` — the user preferred it)
- `gen.py` — calls Gemini, saves `*.raw.png`, and with `--cutout` removes the white
  background (only white regions touching the border, so white details inside survive)

## Finishing the todo batch

```sh
export GEMINI_API_KEY=...        # from aistudio.google.com/apikey, with credits
sh docs/art/run-todo.sh          # writes docs/art/out/<folder>/<name>.png
```

Then convert to WebP and install (game paths):

| out folder | goes to | wired up? |
|---|---|---|
| `bg/quiz.png`, `bg/harvest.png` | `public/bg/` | not yet — needs CSS on `.quiz-stage-wrap` / `.harvest-hero` |
| `mascot/*.png` | `public/mascot/*.webp` | not yet — e.g. `-cheer` on harvest, `-sad` on a wrong answer |
| `char/*.png` | `public/characters/<id>.webp` | not yet — set `img` per character in `src/data/characters.js`, render it in `CharPortrait.jsx` instead of the emoji |
| `care/`, `fert/`, `ui/` | `public/icons/<folder>/` | not yet — match care/fert text by keyword (admins can edit it) |

Conversion used for shipped art: tight-crop, resize (soil/crops 512px, crops bottom-aligned
on a 512 square so stems sit on the soil mound), `cwebp -q 86 -alpha_q 100`.
