import templates from "../data/editable-element-scenes.json" with { type: "json" };
import assets from "../data/assets.json" with { type: "json" };
import {
  backgroundKey,
  type Background,
  type Item,
  type Scene,
} from "./scene.ts";

export function sceneBackgroundKey(background: Background) {
  const template = templates.find(
    (entry) => entry.background.src === background.src,
  );
  return template ? `svg:${template.src}` : backgroundKey(background);
}

export function editableBackground(background: Background) {
  return templates.find((template) => template.src === background.src);
}

export function unpackBackground(scene: Scene, uid: () => string): Scene {
  const template = editableBackground(scene.baseBg);
  if (!template) return scene;
  const layers: Item[] = template.items.map((item, index) => {
    const asset = assets.find((entry) => entry.id === item.assetId);
    if (!asset) throw new Error(`Missing scene element: ${item.assetId}`);
    return {
      uid: uid(),
      backgroundScene: template.src,
      asset,
      x: item.x,
      y: item.y,
      scale: item.scale,
      rotation: 0,
      locked: false,
      z: index + 1,
      flipX: false,
      flipY: false,
      opacity: 1,
      hue: 0,
    };
  });
  return {
    ...scene,
    baseBg: { ...template.background, kind: "full" },
    items: [
      ...layers,
      ...[...scene.items]
        .sort((a, b) => a.z - b.z)
        .map((item, index) => ({ ...item, z: layers.length + index + 1 })),
    ],
  };
}

// Older editable drafts predate layer ownership. Recognize complete template
// blocks, allowing moved objects, but require most positions to still match.
export function adoptBackgroundLayers(scene: Scene): Scene {
  if (scene.items.some((item) => item.backgroundScene)) return scene;
  const sorted = [...scene.items].sort((a, b) => a.z - b.z);
  const ownership = new Map<string, string>();
  let offset = 0;
  while (offset < sorted.length) {
    const template = templates.find((entry) => {
      const block = sorted.slice(offset, offset + entry.items.length);
      return (
        block.length === entry.items.length &&
        block.every(
          (item, index) => item.asset.id === entry.items[index].assetId,
        ) &&
        block.filter(
          (item, index) =>
            Math.abs(item.x - entry.items[index].x) < 0.01 &&
            Math.abs(item.y - entry.items[index].y) < 0.01,
        ).length >= Math.ceil(block.length / 2)
      );
    });
    if (!template) break;
    sorted
      .slice(offset, offset + template.items.length)
      .forEach((item) => ownership.set(item.uid, template.src));
    offset += template.items.length;
  }
  return ownership.size
    ? {
        ...scene,
        items: scene.items.map((item) =>
          ownership.has(item.uid)
            ? { ...item, backgroundScene: ownership.get(item.uid) }
            : item,
        ),
      }
    : scene;
}

export function replaceBackground(
  scene: Scene,
  background: Background,
  uid: () => string,
): Scene {
  if (sceneBackgroundKey(scene.baseBg) === sceneBackgroundKey(background))
    return scene;
  const adopted = adoptBackgroundLayers(scene);
  return unpackBackground(
    {
      ...adopted,
      baseBg: background,
      items: adopted.items.filter((item) => !item.backgroundScene),
    },
    uid,
  );
}
