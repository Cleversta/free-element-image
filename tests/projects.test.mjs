import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { exportProject, importProject, projectName } from "../lib/projects.ts";
import {
  textAsset,
  shapeAsset,
  photoAsset,
  serializeScene,
} from "../lib/scene.ts";
const assets = JSON.parse(
  await readFile(new URL("../data/assets.json", import.meta.url)),
);
const backgrounds = JSON.parse(
  await readFile(new URL("../data/scene-backgrounds.json", import.meta.url)),
);
test("project files preserve editable catalog artwork, text, shapes, photos and canvas size", () => {
  const photo = "data:image/png;base64,iVBORw0KGgo=";
  const scene = {
    baseBg: backgrounds[0],
    size: "square",
    items: [
      assets.find((a) => a.type !== "background"),
      textAsset({ content: "My village", color: "#123456", bold: true }),
      shapeAsset({
        kind: "Rectangle",
        fill: "#123456",
        stroke: "#000000",
        strokeWidth: 2,
      }),
      photoAsset(photo),
    ].map((asset, index) => ({
      uid: `item-${index}`,
      asset,
      x: 25,
      y: 40,
      scale: 1,
      rotation: 30,
      z: index + 1,
      opacity: 0.8,
      hue: 0,
      locked: false,
      flipX: false,
      flipY: true,
    })),
  };
  const imported = importProject(
    exportProject("  My village  ", scene),
    assets,
    backgrounds,
  );
  assert.equal(imported.name, "My village");
  assert.deepEqual(
    JSON.parse(serializeScene(imported.scene)),
    JSON.parse(serializeScene(scene)),
  );
});
test("project import rejects invalid files, versions, unknown assets and oversized content", () => {
  for (const raw of [
    "not json",
    "null",
    JSON.stringify({ format: "other", version: 1 }),
    JSON.stringify({ format: "freelement-project", version: 2, name: "Test" }),
    JSON.stringify({
      format: "freelement-project",
      version: 1,
      name: "Test",
      scene: { baseBg: backgrounds[0], items: [{ assetId: "missing" }] },
    }),
  ])
    assert.throws(() => importProject(raw, assets, backgrounds));
  assert.throws(
    () => importProject("x".repeat(25 * 1024 * 1024 + 1), assets, backgrounds),
    /25 MB/,
  );
  assert.equal(projectName(" "), "Untitled scene");
  assert.equal(projectName("x".repeat(100)).length, 80);
});
