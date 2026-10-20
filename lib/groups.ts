import {
  itemDimensions,
  sceneDimensions,
  type Item,
  type Scene,
} from "./scene.ts";
export function groupMembers(scene: Scene, item: Item) {
  return item.groupId
    ? scene.items.filter((entry) => entry.groupId === item.groupId)
    : [item];
}
export function groupSelection(
  scene: Scene,
  ids: string[],
  groupId?: string,
): Scene {
  const groups = new Set(
    scene.items
      .filter((item) => ids.includes(item.uid))
      .map((item) => item.groupId)
      .filter(Boolean),
  );
  const chosen = scene.items.filter(
    (item) =>
      ids.includes(item.uid) || (item.groupId && groups.has(item.groupId)),
  );
  if (chosen.some((item) => item.locked) || (groupId && chosen.length < 2))
    return scene;
  return {
    ...scene,
    items: scene.items.map((item) =>
      chosen.includes(item) ? { ...item, groupId } : item,
    ),
  };
}
export function resizeGroup(
  scene: Scene,
  original: Item[],
  resized: Item,
): Scene {
  if (original.some((item) => item.locked)) return scene;
  const source = original.find((item) => item.uid === resized.uid)!;
  let factor = resized.scale / source.scale;
  // Respect the scale limits used by saved scenes for every member.
  factor = Math.max(
    ...original.map((item) => 0.15 / item.scale),
    Math.min(factor, ...original.map((item) => 4 / item.scale)),
  );
  const { width, height } = sceneDimensions(scene);
  const before = itemDimensions(source),
    after = itemDimensions(resized);
  const cx = resized.x + (after.width / width) * 50,
    cy = resized.y + (after.height / height) * 50;
  const oldCx = source.x + (before.width / width) * 50,
    oldCy = source.y + (before.height / height) * 50;
  return {
    ...scene,
    items: scene.items.map((item) => {
      const start = original.find((entry) => entry.uid === item.uid);
      if (!start) return item;
      return {
        ...item,
        scale: start.scale * factor,
        x: cx + (start.x - oldCx) * factor,
        y: cy + (start.y - oldCy) * factor,
      };
    }),
  };
}

export function duplicateSelection(
  scene: Scene,
  ids: string[],
  uid: () => string,
): Scene {
  const chosen = new Set(
    scene.items
      .filter((item) => ids.includes(item.uid))
      .flatMap((item) => groupMembers(scene, item).map((entry) => entry.uid)),
  );
  const groups = new Map<string, string>();
  const top = Math.max(0, ...scene.items.map((item) => item.z));
  const copies = scene.items
    .filter((item) => chosen.has(item.uid))
    .map((item, index) => {
      if (item.groupId && !groups.has(item.groupId))
        groups.set(item.groupId, uid());
      return {
        ...item,
        uid: uid(),
        groupId: item.groupId ? groups.get(item.groupId) : undefined,
        backgroundScene: undefined,
        locked: false,
        x: item.x + 2,
        y: item.y + 2,
        z: top + index + 1,
      };
    });
  return { ...scene, items: [...scene.items, ...copies] };
}
