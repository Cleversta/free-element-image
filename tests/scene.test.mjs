import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import {
  initialState,
  backgroundKey,
  sceneReducer,
  updateItem,
  removeItem,
  reorderItem,
  resizeItem,
  restoreScene,
  serializeScene,
  WIDTH,
  HEIGHT,
  ITEM_WIDTH,
  ITEM_HEIGHT,
} from "../lib/scene.ts";

const asset = {
  id: "tree",
  variant: "tree",
  type: "tree",
  style: "test",
  src: "/assets/tree.svg",
};
const baseBg = { name: "Meadow Colors", sky: "#abcdef", ground: "#123456" };
const item = {
  uid: "one",
  asset,
  x: 20,
  y: 30,
  scale: 1,
  rotation: 0,
  z: 1,
  locked: false,
  flipX: false,
  flipY: false,
  opacity: 1,
  hue: 0,
};
const scene = { baseBg, items: [item] };

test("same-name backgrounds have distinct identities and restore the selected artwork", () => {
  const first = {
    ...baseBg,
    name: "Mountains Landscape",
    src: "/mountains-001.svg",
  };
  const second = { ...first, src: "/mountains-002.svg" };
  assert.notEqual(backgroundKey(first), backgroundKey(second));
  assert.notEqual(
    backgroundKey(first),
    backgroundKey({ ...baseBg, name: first.name }),
  );
  for (const selected of [first, second]) {
    const restored = restoreScene(
      serializeScene({ baseBg: selected, items: [] }),
      [asset],
      [first, second],
    );
    assert.equal(backgroundKey(restored.baseBg), backgroundKey(selected));
  }
});
const edit = (state, apply) => sceneReducer(state, { type: "change", apply });

test("undo/redo restores backgrounds and elements together, and branches discard redo", () => {
  let state = initialState(scene);
  state = edit(state, (current) => ({
    ...current,
    baseBg: { ...baseBg, name: "Night" },
    items: [],
  }));
  const replacement = state.present;
  state = sceneReducer(state, { type: "undo" });
  assert.deepEqual(state.present, scene);
  state = sceneReducer(state, { type: "redo" });
  assert.deepEqual(state.present, replacement);
  state = sceneReducer(state, { type: "undo" });
  state = edit(state, (current) =>
    updateItem(current, "one", { rotation: 45 }),
  );
  assert.equal(state.future.length, 0);
});

test("a long drag is one undo step; cancelled gestures restore the original and redo", () => {
  let state = initialState(scene);
  state = sceneReducer(state, { type: "begin" });
  for (let x = 21; x < 90; x++)
    state = edit(state, (current) => updateItem(current, "one", { x }));
  assert.equal(state.past.length, 0);
  state = sceneReducer(state, { type: "end" });
  assert.equal(state.past.length, 1);
  state = sceneReducer(state, { type: "undo" });
  assert.equal(state.present.items[0].x, 20);
  const future = state.future;
  state = sceneReducer(state, { type: "begin" });
  state = edit(state, (current) => updateItem(current, "one", { x: 60 }));
  state = sceneReducer(state, { type: "cancel" });
  assert.equal(state.present.items[0].x, 20);
  assert.deepEqual(state.future, future);
});

test("no-op edits do not fill history, and history is bounded", () => {
  let state = initialState(scene);
  state = edit(state, (current) => updateItem(current, "one", { x: 20 }));
  assert.equal(state.past.length, 0);
  for (let x = 21; x < 100; x++)
    state = edit(state, (current) => updateItem(current, "one", { x }));
  assert.equal(state.past.length, 50);
});

test("locked elements reject transforms, deletion, and layer changes but can unlock", () => {
  const locked = { ...scene, items: [{ ...item, locked: true }] };
  assert.equal(updateItem(locked, "one", { x: 80 }), locked);
  assert.equal(updateItem(locked, "one", { locked: false, x: 80 }), locked);
  assert.equal(removeItem(locked, "one"), locked);
  assert.equal(reorderItem(locked, "one", "front"), locked);
  assert.equal(
    updateItem(locked, "one", { locked: false }).items[0].locked,
    false,
  );
});

test("layer moves swap real neighbors even with old duplicate or sparse z values", () => {
  const layered = {
    ...scene,
    items: [
      item,
      { ...item, uid: "two", z: 1 },
      { ...item, uid: "three", z: 99 },
    ],
  };
  const raised = reorderItem(layered, "one", "up");
  assert.deepEqual(
    raised.items.map((it) => it.uid),
    ["two", "one", "three"],
  );
  assert.deepEqual(
    raised.items.map((it) => it.z),
    [1, 2, 3],
  );
  assert.deepEqual(
    reorderItem(raised, "one", "back").items.map((it) => it.uid),
    ["one", "two", "three"],
  );
  assert.deepEqual(
    reorderItem(raised, "one", "front").items.map((it) => it.uid),
    ["two", "three", "one"],
  );
});

function oppositeCorner(it, corner) {
  const sx = (corner.includes("e") ? 1 : -1) * (it.flipX ? -1 : 1);
  const sy = (corner.includes("s") ? 1 : -1) * (it.flipY ? -1 : 1);
  const angle = (it.rotation * Math.PI) / 180;
  return [
    (it.x / 100) * WIDTH +
      (ITEM_WIDTH * it.scale) / 2 -
      ((sx * ITEM_WIDTH * Math.cos(angle) -
        sy * ITEM_HEIGHT * Math.sin(angle)) *
        it.scale) /
        2,
    (it.y / 100) * HEIGHT +
      (ITEM_HEIGHT * it.scale) / 2 -
      ((sx * ITEM_WIDTH * Math.sin(angle) +
        sy * ITEM_HEIGHT * Math.cos(angle)) *
        it.scale) /
        2,
  ];
}
test("each resize corner preserves its opposite anchor through rotations and flips", () => {
  for (const corner of ["nw", "ne", "sw", "se"])
    for (const rotation of [0, 45, -90, 179])
      for (const flipX of [false, true])
        for (const flipY of [false, true]) {
          const before = { ...item, rotation, flipX, flipY };
          const after = { ...before, ...resizeItem(before, corner, 120, 70) };
          const a = oppositeCorner(before, corner),
            b = oppositeCorner(after, corner);
          assert.ok(Math.abs(a[0] - b[0]) < 1e-8);
          assert.ok(Math.abs(a[1] - b[1]) < 1e-8);
          assert.ok(after.scale >= 0.15 && after.scale <= 4);
        }
});

test("compact saves round-trip and legacy saves resolve trusted assets with defaults", () => {
  assert.deepEqual(
    restoreScene(serializeScene(scene), [asset], [baseBg]),
    scene,
  );
  const legacy = {
    baseBg: { ...baseBg, name: "Meadow" },
    items: [
      {
        ...item,
        asset: { ...asset, id: "old-id" },
        opacity: undefined,
        hue: undefined,
      },
    ],
  };
  const restored = restoreScene(JSON.stringify(legacy), [asset], [baseBg]);
  assert.equal(restored.items[0].asset, asset);
  assert.equal(restored.items[0].opacity, 1);
  assert.equal(restored.items[0].hue, 0);
});

test("malformed saves and unrecognized image URLs cannot enter the editor", () => {
  for (const raw of [
    "not json",
    "{}",
    '{"items":null}',
    JSON.stringify({ baseBg, items: [null] }),
    JSON.stringify({
      baseBg,
      items: [
        { ...item, asset: { ...asset, src: "https://untrusted/image.svg" } },
      ],
    }),
  ]) {
    assert.throws(() => restoreScene(raw, [asset], [baseBg]));
  }
  const normalized = restoreScene(
    JSON.stringify({ baseBg, items: [{ ...item, scale: 100, opacity: -10 }] }),
    [asset],
    [baseBg],
  );
  assert.equal(normalized.items[0].scale, 4);
  assert.equal(normalized.items[0].opacity, 0.1);
});

test("every catalog entry has a unique ID, reachable category, and existing SVG", async () => {
  const catalog = JSON.parse(
    await readFile(new URL("../data/assets.json", import.meta.url)),
  );
  assert.equal(new Set(catalog.map((a) => a.id)).size, catalog.length);
  const types = new Set([
    "tree",
    "small-tree",
    "flower",
    "grass",
    "plant",
    "rocks",
    "building",
    "structure",
    "village-prop",
    "garden-equipment",
    "decoration",
    "animal",
    "character",
    "vehicles",
    "water",
    "terrain",
    "effect",
    "sky",
    "background",
  ]);
  for (const entry of catalog) {
    assert.ok(types.has(entry.type), entry.type);
    await access(new URL("../public" + entry.src, import.meta.url));
  }
});

test("crafted backgrounds have unique identities and render as full-size SVGs", async () => {
  const { default: sharp } = await import("sharp");
  const scenes = JSON.parse(
    await readFile(new URL("../data/scene-backgrounds.json", import.meta.url)),
  );
  assert.equal(scenes.length, 12);
  assert.equal(new Set(scenes.map(backgroundKey)).size, scenes.length);
  for (const bg of scenes) {
    assert.ok(bg.description.length > 30);
    const svg = await readFile(new URL("../public" + bg.src, import.meta.url));
    const metadata = await sharp(svg).metadata();
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 800);
    await sharp(svg).resize(120, 80).png().toBuffer();
  }
});
