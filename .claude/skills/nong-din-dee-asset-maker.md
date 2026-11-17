---
name: nong-din-dee-asset-maker
description: Generate or regenerate game art assets for น้องดินดี 77 จังหวัด — glossy 3D "clay toy" casual-mobile style, transparent WebP, saved under public/{mascot,crops,soil,bg,icons}/. Use when asked to create, redraw, or restyle the mascot, a crop, a soil type, an icon, or a background for this game.
---

# น้องดินดี asset maker

## Art direction
- Style: cute stylized 3D "clay toy" art for a casual mobile game — handmade polymer-clay look with a soft satin sheen, chunky rounded shapes, soft key light from upper-left, bright saturated natural colors, Thai farmland setting. The exact style paragraph is `docs/art/prompts/style-bible.txt`; prefix it to every prompt.
- Soil islands must read as real earth (crumbly clay cliff, soil horizons), not cake.
- Crops: the shipped set is the ORIGINAL crop art (one bold hero produce on a short plant, with a small dirt mound at its base) — the user preferred it over a regenerated whole-tree set because it reads better at small sizes. New crops must match it (pass `public/crops/01-rice.webp` as the reference), keeping the small dirt base.
- Always pass an existing shipped asset of the same kind as a style reference image (e.g. `public/soil/07-saline.webp`, `public/crops/01-rice.webp`, `public/mascot/nong-din-dee.webp`, `public/bg/map-bg.webp`) so new art matches camera angle, lighting and material.
- Generate on a plain pure white background, then cut it out (white regions touching the border only).

## Tool
`docs/art/gen.py` (calls Gemini directly; needs `GEMINI_API_KEY` with prepaid credits) — see `docs/art/README.md`. The `game-asset-gen` MCP tools also work once the key is in the environment that launches the editor.

If no key is set or the provider returns a quota/billing error, stop and tell the user — don't silently substitute a different-looking SVG, it would break the unified style.

## Output convention (matches this project's real folders)
- Mascot: `public/mascot/nong-din-dee.webp` (waving); poses as `nong-din-dee-<pose>.webp`
- Crops: `public/crops/NN-slug.webp` — index/slug as in `src/data/content.js` `CROPS`; tight-crop, fit in 480×496, bottom-center aligned on a 512×512 transparent canvas
- Soil: `public/soil/NN-slug.webp` — as in `SOIL`; tight-crop, 512px wide (top-surface center sits ~26% from the top; crop anchor offsets in `QuizScreen.jsx`/`HarvestScreen.jsx`/`index.css` depend on this)
- Map background: keep the original `public/bg/map-bg.webp` (user's choice); other screen backdrops go in `public/bg/`, 750px wide portrait
- Icons: `public/icons/{care,fert,ui}/slug.webp`
- Convert with `cwebp -q 86 -alpha_q 100`. After installing, run the game and check the asset in place before reporting it done.
