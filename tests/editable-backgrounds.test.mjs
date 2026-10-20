import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { backgrounds, savedBackgrounds } from "../lib/backgrounds.ts";
import {
  editableBackground,
  unpackBackground,
  replaceBackground,
  adoptBackgroundLayers,
} from "../lib/editable-backgrounds.ts";
import {
  serializeScene,
  restoreScene,
  initialState,
  sceneReducer,
} from "../lib/scene.ts";
const assets = JSON.parse(await readFile("data/assets.json", "utf8"));

test("all twelve Freeimage scenes unpack into editable, saveable layers", async () => {
  const choices = backgrounds.filter(editableBackground);
  assert.equal(choices.length, 12);
  for (const background of choices) {
    let id = 0;
    const original = { baseBg: background, items: [] };
    const unpacked = unpackBackground(original, () => `layer-${++id}`);
    assert.ok(unpacked.items.length >= 4);
    assert.ok(
      unpacked.items.every(
        (item) =>
          item.asset.src.startsWith("/assets/freeimage/") && !item.locked,
      ),
    );
    assert.notEqual(unpacked.baseBg.src, background.src);
    assert.deepEqual(
      restoreScene(serializeScene(unpacked), assets, savedBackgrounds),
      unpacked,
    );
    assert.equal(
      unpackBackground(unpacked, () => "duplicate"),
      unpacked,
    );
    const bytes = await readFile(`public${unpacked.baseBg.src}`);
    assert.equal((await sharp(bytes).metadata()).width, 1200);
  }
});

test("unpacking preserves added objects above scene layers and undoes together", () => {
  const background = backgrounds.find(editableBackground);
  const added = {
    uid: "user-object",
    asset: assets[0],
    x: 10,
    y: 20,
    scale: 1,
    z: 1,
    locked: true,
    rotation: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
    hue: 0,
  };
  const original = { baseBg: background, items: [added] };
  let id = 0;
  const unpacked = unpackBackground(original, () => `layer-${++id}`);
  const preserved = unpacked.items.at(-1);
  assert.deepEqual({ ...preserved, z: added.z }, added);
  assert.equal(preserved.z, unpacked.items.length);
  const changed = sceneReducer(initialState(original), {
    type: "change",
    apply: () => unpacked,
  });
  assert.deepEqual(changed.present, unpacked);
  assert.deepEqual(sceneReducer(changed, { type: "undo" }).present, original);
});

test("background changes remove owned layers, preserve user objects and migrate old drafts", () => {
  let id = 0;
  const original = unpackBackground(
    { baseBg: backgrounds.find(editableBackground), items: [] },
    () => `layer-${++id}`,
  );
  const user = {
    ...original.items[0],
    uid: "user",
    z: original.items.length + 1,
    backgroundScene: undefined,
    x: 50,
  };
  const old = {
    ...original,
    items: [
      ...original.items.map((item) => ({
        ...item,
        backgroundScene: undefined,
      })),
      user,
    ],
  };
  const adopted = adoptBackgroundLayers(old);
  assert.ok(adopted.items[0].backgroundScene);
  assert.equal(adopted.items.at(-1).backgroundScene, undefined);
  const colors = backgrounds.find((bg) => bg.name === "Meadow Colors");
  const result = replaceBackground(old, colors, () => `layer-${++id}`);
  assert.deepEqual(result.items, [user]);
});
