# Freelement Images

A countryside scene editor built with Next.js 15, React 19, and TypeScript.
Create scenes from bundled SVG artwork, arrange each element, and download a PNG.
Editing and downloading run in the browser; no visitor account or cloud configuration is needed.
Optional anonymous submissions store scenes privately for review and provide a private management link.

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

`npm start` runs the built Next.js site at http://localhost:3000, including direct links to `/create`.
Use `npm start -- --port 3001` for another port.
Netlify uses `netlify.toml` and the `.next/` build output. Do not deploy the old `out/` folder.
See [cloud setup](docs/CLOUD_SETUP.md) for Supabase, R2, environment variables, and hosting.
The editor builds without credentials. Submissions require the cloud setup and Turnstile. Owners review at `/admin`; approved images appear at `/gallery` with public download pages.

## Editor features

- 374 catalog assets: 316 placeable objects and 58 SVG backgrounds. The picker shows 54 backgrounds, including 36 simple skies, gradients, and open landscapes; older backgrounds remain available to saved scenes.
- Scenes, Objects, Village, and More panels with searchable categories.
- All artwork appears together in searchable category groups.
- Random scene composition, with objects distributed across the scene.
- Dragging, corner resizing, rotation, flips, opacity, hue, duplication, and layer ordering.
- Locked elements remain selectable but cannot be moved, changed, or deleted until unlocked.
- Undo/redo for scene edits, backgrounds, New, and Clear All. A drag or slider gesture is one undo step; the most recent 50 actions are retained.
- Canvas presets: landscape (1200 × 800), square (1080 × 1080), portrait post (1080 × 1350), and phone wallpaper (1080 × 1920). Previews, downloads, and published scenes use the selected dimensions.
- Mobile canvas zoom (100–300%), two-finger pinch, Move canvas panning, and Fit scene reset. View zoom does not change saved scenes or downloads.
- Save and restore in this browser, with status messages and validation of stored scenes.

**Save to My creations** saves directly without opening a panel. The first save uses “My village”; later saves update that scene. Use **My creations** to rename it or manage saved scenes. Ctrl/⌘ S immediately saves the current working draft in this browser.
Changes autosave after a short pause. Shared scenes and starter templates autosave separately from the main scene. Clearing browser data removes the saved scene.
**New** resets the background and objects; **Clear All** removes objects while keeping the background.
Both can be undone during the current session, including when they remove locked objects.

Keyboard shortcuts outside text inputs:

- Ctrl/⌘ Z: undo; Ctrl/⌘ Shift Z or Ctrl/⌘ Y: redo.
- Ctrl/⌘ S: save; Ctrl/⌘ D: duplicate the selected element.
- Arrow keys: move by one canvas pixel; Shift + Arrow: move by ten.
- Delete/Backspace: delete an unlocked selection; Escape: deselect or cancel a drag.

## My creations (no account)

Find **My creations** near the top of the homepage to see saved-scene thumbnails and open a scene directly. **Manage saved scenes** opens the editor’s My creations panel. Open **My creations** in the editor to save named projects with thumbnails in this browser. **Save this scene** adds a scene on the first save and updates that same scene on later saves; **Save a new copy** creates a separate scene; **More options → Update with this scene** updates an existing saved scene after confirmation. Open, rename, duplicate, export, and delete projects here. Opening is undoable and does not change the saved snapshot. Existing working-scene autosave and starter/shared scene drafts remain available.

Projects use IndexedDB separately from working-scene autosave. Clearing browser data removes both. There is no account or automatic cross-device sync. Under **Back up or move scenes**, choose **Download current scene backup** to get a `.freelement.json` file for another device or a backup. Use **Open backup file** to restore it to the saved scenes list. Imports create a new project without overwriting existing projects or the working scene. Project files contain editable scene data, text, shapes, and any uploaded photos; share them only when you intend to share those photos. Maximum project file size is 25 MB. Artwork from the bundled catalog is referenced by ID and requires a compatible version of this website.

## Canvas size

Choose **Canvas size** above the canvas. Existing objects retain their pixel size and percentage position. Illustrated backgrounds fill the new format with a centered crop. Random retains the selected size; New starts a fresh landscape. Old saves without a size still open at 1200 × 800.

## Text and photo backgrounds

Open **Text**, then **Add text**, for editable captions with color and bold controls. Text supports up to 8 displayed lines, wraps at 20 characters, and uses the same move, resize, rotate, and layer tools as objects. Text is included in downloads and submitted for owner review when published.

Open **Upload image**, then **Choose image**, to add JPG, PNG, or WebP files up to 15 MB as movable objects. Uploaded objects preserve transparency and support resize, rotation, flips, opacity, layers, duplication, locking, undo, autosave, and downloads. Photo scenes can be submitted for owner review after migration 007; publishing shares the processed photos and editable copy. Open **Backgrounds** and select **Use your photo as background** to fill the canvas. The full photo is resized to a maximum 1920-pixel edge and stored in this browser. Photo crop controls provide 100–300% zoom, horizontal/vertical positioning, 90° rotation, horizontal/vertical flips, and a reset button. Choose **Crop on photo** (or tap the photo canvas) to show a framing grid. Drag directly on the photo to reposition the crop; use the on-canvas zoom and rotate buttons, then **Done** to resume element editing. Cropping and size changes are undoable and autosaved. Older photo saves retain their previously cropped image; upload the original again to recover the full frame. Photo scenes can be saved and downloaded; public publishing supports catalog and photo backgrounds. Choosing another background replaces the photo and can be undone. Browser storage failures are reported so you can download a copy.

## Imported artwork

164 curated SVGs were imported from `/home/marason/freeimage`.
34 graphics were excluded for visual fit and 8 duplicates were omitted.
The source folder was preserved. `data/freeimage-import.json` records every import decision.
Imported SVGs retain their embedded metadata in `public/assets/freeimage/`.
Imported and original artwork appear together in the editor’s category groups.

## Checks

```bash
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

`check` runs ESLint, TypeScript, and the scene, asset, backend configuration, and database permission regression tests.
Browser tests run against the production Next.js site on port 4173. They cover desktop/mobile editing,
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

Alongside 36 simple backdrops, the scene picker contains 12 original, detailed SVG landscapes, two retained classic scenes,
and four plain color choices. Repetitive older choices are hidden from the picker, but their
files and save compatibility are retained.

New scenes include Alpine Mirror Lake, Sunlit Coastal Cove, Emerald Rice Terraces,
Lavender Golden Hour, Silver Birch Clearing, Sandstone Arch Canyon, Northern Lights River,
Cherry Blossom Bridge, Tuscan Vineyard, Hidden Jungle Falls, Copperwood Creek, and Wildflower Trail.

Artwork lives in `public/assets/crafted-landscapes/`, with scene metadata in
`data/scene-backgrounds.json`. Run `python3 scripts/create-backgrounds.py` to regenerate
these deterministic, editable SVG files and their catalog entries. Python is only needed
when regenerating artwork, not for running or building the app.

Owner review uses `ADMIN_ACCESS_KEY` in `.env.local` (and Netlify Functions settings).
See [cloud setup](docs/CLOUD_SETUP.md#6-owner-review-and-public-gallery) for review, sharing terms, and recovery of interrupted approvals.

## Local launch improvements

Starter landscapes are at `/scenes` and beginner guides at `/guides`. They are statically generated and need no database access. Read [release steps](docs/RELEASE_STEPS.md) before deploying: migration 006 is required for publishing and owner-login limits, and migration 008 adds readable public image URLs. No ads are enabled; optional `ADSENSE_PUBLISHER_ID` configures only `ads.txt`.

Regenerate starter previews with `node scripts/prepare-content-assets.mjs`. The source-evidence inventory at `docs/ARTWORK_REVIEW.json` is generated by `node scripts/audit-artwork.mjs`; embedded source/license claims still require owner verification.

## Simple backgrounds

The background picker includes 36 original SVG backdrops across Skies, Gradients, and Open landscapes, with six color moods per style. Search by name or filter by category. Full scenes and color backgrounds remain available. Regenerate the simple artwork and metadata with `node scripts/create-simple-backgrounds.mjs`. New artwork goes through the existing owner review before public publication.

## Photo editor

The homepage offers Create a scene and Edit a photo (`/create?mode=photo`). Photo editing has its own working draft, uses the closest canvas preset for a chosen background photo, and supports crop ratios (including 16:9, 4:3, and 3:4), 90° rotation, horizontal/vertical flips, brightness, contrast, saturation, reset, text, existing elements, downloads, and My creations. Photo submissions follow the same owner review and public gallery flow. The server validates raster formats and dimensions, removes embedded metadata, and retains an editable normalized copy. Apply `007_photo_scenes.sql` after migration 004 before deploying this feature; it raises the editable scene limit to 3 MB. The request limit remains 4 MB and submission quota remains unchanged.
