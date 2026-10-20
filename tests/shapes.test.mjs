import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  SHAPE_NAMES,
  shapeAsset,
  serializeScene,
  restoreScene,
} from "../lib/scene.ts";

test("every shape survives saving and renders as SVG", async () => {
  const baseBg = { name: "Plain", sky: "#ffffff", ground: "#ffffff" };
  for (const kind of SHAPE_NAMES) {
    const asset = shapeAsset({
      kind,
      ...(kind === "Drawing"
        ? {
            points: [
              [10, 10],
              [150, 100],
              [300, 200],
            ],
          }
        : {}),
      fill: "#ff0000",
      stroke: "#000000",
      strokeWidth: 4,
    });
    const scene = {
      baseBg,
      items: [
        {
          uid: "shape",
          asset,
          x: 30,
          y: 30,
          scale: 1,
          rotation: 0,
          locked: false,
          z: 1,
          flipX: false,
          flipY: false,
          opacity: 1,
          hue: 0,
        },
      ],
    };
    const restored = restoreScene(serializeScene(scene), [], [baseBg]);
    assert.deepEqual(restored, scene);
    const { data, info } = await sharp(
      Buffer.from(
        decodeURIComponent(restored.items[0].asset.src.split(",")[1]),
      ),
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 320);
    assert.ok(
      data.some((value, i) => i % 4 === 3 && value > 0),
      kind,
    );
  }
});

test("shape SVG rejects untrusted geometry and style values", () => {
  const style = {
    kind: "Circle",
    fill: "#ff0000",
    stroke: "#000000",
    strokeWidth: 2,
  };
  for (const patch of [
    { kind: "__proto__" },
    { fill: "url(https://example.com)" },
    { stroke: '\"><script/>' },
    { strokeWidth: NaN },
    { strokeWidth: 21 },
  ]) {
    assert.throws(() => shapeAsset({ ...style, ...patch }), /Invalid shape/);
  }
});

test("custom dimensions and hidden layers survive saving, with bounded dimensions", async () => {
  const { itemDimensions, resizeItem, moveLayer, updateItem } =
    await import("../lib/scene.ts");
  const baseBg = { name: "Plain", sky: "#ffffff", ground: "#ffffff" };
  const asset = shapeAsset({
    kind: "Rectangle",
    fill: "#ff0000",
    stroke: "#000000",
    strokeWidth: 0,
    width: 600,
    height: 100,
  });
  const item = {
    uid: "wide",
    asset,
    x: 20,
    y: 30,
    scale: 1,
    rotation: 0,
    locked: false,
    z: 1,
    flipX: false,
    flipY: false,
    opacity: 1,
    hue: 0,
    hidden: true,
  };
  const scene = {
    baseBg,
    items: [item, { ...item, uid: "front", z: 2, locked: true }],
  };
  assert.deepEqual(restoreScene(serializeScene(scene), [], [baseBg]), scene);
  assert.deepEqual(itemDimensions(item), { width: 600, height: 100 });
  const resized = resizeItem(item, "se", 600, 100);
  assert.equal(resized.scale, 2);
  assert.equal(resized.x, item.x);
  assert.equal(resized.y, item.y);
  assert.equal(moveLayer(scene, "wide", "front").items.at(-1).uid, "wide");
  assert.equal(moveLayer(scene, "front", "wide"), scene);
  assert.equal(updateItem(scene, "front", { hidden: false }), scene);
  for (const width of [0, -1, 1201, Infinity, "600"]) {
    assert.throws(
      () => shapeAsset({ ...asset.shape, width }),
      /Invalid shape dimensions/,
    );
  }
  const metadata = await sharp(
    Buffer.from(decodeURIComponent(asset.src.split(",")[1])),
  ).metadata();
  assert.equal(metadata.width, 600);
  assert.equal(metadata.height, 100);
});

test("published images use stretched dimensions and omit hidden layers", async () => {
  const { renderSubmission } =
    await import("../lib/server/render-submission.ts");
  const { savedBackgrounds } = await import("../lib/backgrounds.ts");
  const baseBg = savedBackgrounds[0];
  const asset = shapeAsset({
    kind: "Rectangle",
    fill: "#ff0000",
    stroke: "#000000",
    strokeWidth: 0,
    width: 600,
    height: 100,
  });
  const item = {
    uid: "wide",
    asset,
    x: 20,
    y: 30,
    scale: 1,
    rotation: 0,
    locked: false,
    z: 1,
    flipX: false,
    flipY: false,
    opacity: 1,
    hue: 0,
  };
  const visible = await renderSubmission(
    serializeScene({ baseBg, items: [item] }),
  );
  const { data } = await sharp(visible.png)
    .extract({ left: 700, top: 280, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.deepEqual([...data.slice(0, 3)], [255, 0, 0]);
  const hidden = await renderSubmission(
    serializeScene({ baseBg, items: [{ ...item, hidden: true }] }),
  );
  const empty = await renderSubmission(serializeScene({ baseBg, items: [] }));
  assert.deepEqual(hidden.png, empty.png);
});
