# Freelement Images

A countryside scene editor built with Next.js 15, React 19, and TypeScript.
Create scenes from bundled SVG artwork, arrange each element, and download a PNG.
Everything runs in the browser; no API key, account, or database is needed.

## Start developing

Use **Node.js 22** (the project includes `.nvmrc`).

```bash
nvm install
nvm use
npm ci
npm run dev
```

Open http://localhost:3000 for the homepage or http://localhost:3000/create for the editor.

## Build and preview

```bash
npm run build
npm start
```

`npm start` serves the built site at http://127.0.0.1:3000, including direct links to `/create`.
Use `npm start -- --port 3001` for another port.
The deployable static files are in `out/`; publish that folder to a static host.
The included server is a local preview server.

## Editor features

- 374 catalog assets: 316 placeable objects and 58 SVG backgrounds. The picker shows 18 curated choices; older backgrounds remain available to saved scenes.
- Scenes, Objects, Village, and More panels with searchable categories.
- All artwork, Imported SVGs, and Original artwork collection filters.
- Random scene composition, with objects distributed across the scene.
- Dragging, corner resizing, rotation, flips, opacity, hue, duplication, and layer ordering.
- Locked elements remain selectable but cannot be moved, changed, or deleted until unlocked.
- Undo/redo for scene edits, backgrounds, New, and Clear All. A drag or slider gesture is one undo step; the most recent 50 actions are retained.
- Responsive canvas with a fixed 3:2 composition, matching the 1200 × 800 PNG export.
- Save and restore in this browser, with status messages and validation of stored scenes.

**Save** stores one scene in this browser and replaces the previous saved scene.
Changes are not autosaved. Clearing browser data removes the saved scene.
**New** resets the background and objects; **Clear All** removes objects while keeping the background.
Both can be undone during the current session, including when they remove locked objects.

Keyboard shortcuts outside text inputs:

- Ctrl/⌘ Z: undo; Ctrl/⌘ Shift Z or Ctrl/⌘ Y: redo.
- Ctrl/⌘ S: save; Ctrl/⌘ D: duplicate the selected element.
- Arrow keys: move by one canvas pixel; Shift + Arrow: move by ten.
- Delete/Backspace: delete an unlocked selection; Escape: deselect or cancel a drag.

## Imported artwork

164 curated SVGs were imported from `/home/marason/freeimage`.
34 graphics were excluded for visual fit and 8 duplicates were omitted.
The source folder was preserved. `data/freeimage-import.json` records every import decision.
Imported SVGs retain their embedded metadata in `public/assets/freeimage/`.
Select **Imported SVGs** in the editor to browse them.

## Checks

```bash
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

`check` runs ESLint, TypeScript, and the scene model/asset regression tests.
Browser tests run against the built static site on port 4173. They cover desktop/mobile editing,
save recovery, errors, and pixel comparison of the scene preview with its downloaded PNG.
Run `npm run format` to format the source.

The PostCSS and sharp overrides in `package.json` select patched versions of Next.js dependencies.
Recheck these overrides and run the build and tests when upgrading Next.js.

## Project structure

- `app/`: homepage, editor route, metadata, and responsive styles.
- `components/Generator.tsx`: editor interface and browser interaction.
- `lib/scene.ts`: history, transforms, layering, and save validation.
- `lib/backgrounds.ts`: SVG and color background choices.
- `lib/export.ts`: PNG rendering using the same canvas coordinates as the preview.
- `data/assets.json`: asset catalog.
- `public/assets/`: bundled SVG artwork.
- `tests/`: regression and browser tests.
- `V*.json`: historical version notes, not runtime configuration.


## Curated landscape collection

The scene picker contains 12 original, detailed SVG landscapes, two retained classic scenes,
and four plain color choices. Repetitive older choices are hidden from the picker, but their
files and save compatibility are retained.

New scenes include Alpine Mirror Lake, Sunlit Coastal Cove, Emerald Rice Terraces,
Lavender Golden Hour, Silver Birch Clearing, Sandstone Arch Canyon, Northern Lights River,
Cherry Blossom Bridge, Tuscan Vineyard, Hidden Jungle Falls, Copperwood Creek, and Wildflower Trail.

Artwork lives in `public/assets/crafted-landscapes/`, with scene metadata in
`data/scene-backgrounds.json`. Run `python3 scripts/create-backgrounds.py` to regenerate
these deterministic, editable SVG files and their catalog entries. Python is only needed
when regenerating artwork, not for running or building the app.
