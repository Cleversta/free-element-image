# Freelement Images

A complete Next.js MVP for an element-based procedural image generator. No prompt and no AI generation API are required.

## Features
- 110 bundled SVG countryside assets
- Category selector
- Instant randomized scene generation
- Drag elements with mouse/touch
- Resize, rotate, lock and delete selected elements
- Clear and regenerate
- Browser-side PNG export
- Responsive desktop/mobile UI
- Static-export compatible Next.js project

## Run
```bash
npm install
npm run dev
```
Open http://localhost:3000 and use `/create` for the generator.

## Production build
```bash
npm run build
```
Because `next.config.ts` uses `output: 'export'`, the deployable static site is generated in `out/` and can be hosted on Cloudflare Pages.

## Important MVP note
This is the first working composition engine. Before publishing a large public image library, visually QA generated scenes and tune placement/collision/perspective rules.


## Element Picker Update

This version adds the manual element browser requested for Freelement Images.

- Browse all asset categories
- Search elements by name
- Click an SVG thumbnail to add it directly to the scene
- Drag elements around the canvas
- Resize, rotate, flip, duplicate, lock, delete
- Move selected elements forward/backward
- Keep the original random scene generator
- Download the composed scene as PNG

Run `npm install` and then `npm run dev`.

The ZIP has `package.json` directly at its root, so there is no extra nested project folder.


## V3 — Realistic SVG treatment

All 110 countryside SVG assets have been upgraded with a richer vector rendering
treatment while keeping the same filenames and URLs used by the generator.

The update adds subtle organic surface texture, directional highlights and soft depth
shadows. The assets remain transparent, scalable SVG files.

Important: SVG is vector artwork, so this pack targets a detailed/semi-realistic
illustration look rather than literal photographic realism.


## V4 — Detailed SVG rendering

Upgraded 110 SVG assets again. V4 replaces flat color fills with 222
directional vector gradients and adds restrained texture, lighting, and depth treatment.
All existing asset filenames and URLs remain unchanged.


## V5 — Ultra-detailed SVG rendering

V5 applies category-specific material rendering to all 110 assets instead of one generic
filter. Animals, vegetation, buildings, water, terrain, sky and props receive different
texture frequencies and lighting behavior. V4 gradients are retained.

This is intentionally the strongest practical SVG-only rendering pass without embedding
raster photographs inside SVG files.
