import test from "node:test";
import assert from "node:assert/strict";
import { groupSelection, resizeGroup, groupMembers } from "../lib/groups.ts";
import { serializeScene, restoreScene } from "../lib/scene.ts";
const asset = {
  id: "a",
  type: "tree",
  variant: "tree",
  style: "test",
  src: "/tree.svg",
};
const baseBg = { name: "Test", sky: "#fff", ground: "#aaa" };
const make = (uid, x) => ({
  uid,
  asset,
  x,
  y: 20,
  scale: 1,
  rotation: 0,
  z: 1,
  locked: false,
  flipX: false,
  flipY: false,
  opacity: 1,
  hue: 0,
});
test("groups survive saving, expand selection and ungroup without moving items", () => {
  const scene = { baseBg, items: [make("a", 10), make("b", 40)] };
  const grouped = groupSelection(scene, ["a", "b"], "g");
  assert.equal(groupMembers(grouped, grouped.items[0]).length, 2);
  assert.deepEqual(
    restoreScene(serializeScene(grouped), [asset], [baseBg]),
    grouped,
  );
  const ungrouped = groupSelection(grouped, ["a"]);
  assert.ok(ungrouped.items.every((item) => !item.groupId));
  assert.equal(ungrouped.items[1].x, 40);
});
test("group resize scales member sizes and spacing together; locks prevent changes", () => {
  const scene = groupSelection(
    { baseBg, items: [make("a", 10), make("b", 40)] },
    ["a", "b"],
    "g",
  );
  const resized = resizeGroup(scene, scene.items, {
    ...scene.items[0],
    scale: 2,
  });
  assert.equal(resized.items[1].scale, 2);
  assert.equal(resized.items[1].x - resized.items[0].x, 60);
  const locked = {
    ...scene,
    items: scene.items.map((item, index) => ({ ...item, locked: index === 1 })),
  };
  assert.equal(
    resizeGroup(locked, locked.items, { ...locked.items[0], scale: 2 }),
    locked,
  );
});
