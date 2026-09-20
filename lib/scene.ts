export const WIDTH = 1200;
export const HEIGHT = 800;
export const ITEM_WIDTH = 320;
export const ITEM_HEIGHT = 270;
export const HISTORY_LIMIT = 50;

export type Asset = {
  id: string;
  type: string;
  variant: string;
  style: string;
  src: string;
};
export type Background = {
  name: string;
  description?: string;
  sky: string;
  ground: string;
  src?: string;
  kind?: "full" | "landscape";
};

// Display names can repeat; SVG paths identify the actual artwork.
export const backgroundKey = (background: Background) =>
  background.src ? `svg:${background.src}` : `colors:${background.name}`;
export type Item = {
  uid: string;
  asset: Asset;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  locked: boolean;
  z: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  hue: number;
};
export type Scene = { baseBg: Background; items: Item[] };
export type EditorState = {
  present: Scene;
  past: Scene[];
  future: Scene[];
  gesture: Scene | null;
};
export type Action =
  | { type: "change"; apply: (scene: Scene) => Scene }
  | { type: "load"; scene: Scene }
  | { type: "begin" | "end" | "cancel" | "undo" | "redo" };

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export const normalizeRotation = (value: number) =>
  ((((value + 180) % 360) + 360) % 360) - 180;
export const initialState = (scene: Scene): EditorState => ({
  present: scene,
  past: [],
  future: [],
  gesture: null,
});

export function sceneReducer(state: EditorState, action: Action): EditorState {
  if (action.type === "load") return initialState(action.scene);
  if (action.type === "begin")
    return state.gesture ? state : { ...state, gesture: state.present };
  if (action.type === "cancel")
    return state.gesture
      ? { ...state, present: state.gesture, gesture: null }
      : state;
  if (action.type === "end") {
    if (!state.gesture) return state;
    return {
      ...state,
      gesture: null,
      past:
        state.present === state.gesture
          ? state.past
          : [...state.past, state.gesture].slice(-HISTORY_LIMIT),
      future: state.present === state.gesture ? state.future : [],
    };
  }
  if (action.type === "change") {
    const present = action.apply(state.present);
    if (present === state.present) return state;
    return {
      ...state,
      present,
      past: state.gesture
        ? state.past
        : [...state.past, state.present].slice(-HISTORY_LIMIT),
      future: state.gesture ? state.future : [],
    };
  }
  // Finish an in-progress gesture before traversing history.
  if (state.gesture) state = sceneReducer(state, { type: "end" });
  if (action.type === "undo" && state.past.length) {
    return {
      present: state.past[state.past.length - 1],
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
      gesture: null,
    };
  }
  if (action.type === "redo" && state.future.length) {
    return {
      present: state.future[0],
      past: [...state.past, state.present].slice(-HISTORY_LIMIT),
      future: state.future.slice(1),
      gesture: null,
    };
  }
  return state;
}

export function updateItem(
  scene: Scene,
  uid: string,
  patch: Partial<Item>,
): Scene {
  const item = scene.items.find((it) => it.uid === uid);
  if (!item) return scene;
  // A locked item can only be unlocked; other properties stay protected.
  if (
    item.locked &&
    !(Object.keys(patch).length === 1 && patch.locked === false)
  )
    return scene;
  if (
    Object.entries(patch).every(
      ([key, value]) => item[key as keyof Item] === value,
    )
  )
    return scene;
  return {
    ...scene,
    items: scene.items.map((it) => (it.uid === uid ? { ...it, ...patch } : it)),
  };
}

export function removeItem(scene: Scene, uid: string): Scene {
  const item = scene.items.find((it) => it.uid === uid);
  return !item || item.locked
    ? scene
    : { ...scene, items: scene.items.filter((it) => it.uid !== uid) };
}

export function reorderItem(
  scene: Scene,
  uid: string,
  mode: "up" | "down" | "front" | "back",
): Scene {
  const sorted = [...scene.items].sort((a, b) => a.z - b.z);
  const from = sorted.findIndex((it) => it.uid === uid);
  if (from < 0 || sorted[from].locked) return scene;
  const to =
    mode === "front"
      ? sorted.length - 1
      : mode === "back"
        ? 0
        : clamp(from + (mode === "up" ? 1 : -1), 0, sorted.length - 1);
  if (from === to) return scene;
  const [item] = sorted.splice(from, 1);
  sorted.splice(to, 0, item);
  return {
    ...scene,
    items: sorted.map((it, index) => ({ ...it, z: index + 1 })),
  };
}

// Drag a corner while holding the opposite corner fixed, including rotation/flips.
export function resizeItem(
  item: Item,
  corner: string,
  dx: number,
  dy: number,
): Partial<Item> {
  const sx = (corner.includes("e") ? 1 : -1) * (item.flipX ? -1 : 1);
  const sy = (corner.includes("s") ? 1 : -1) * (item.flipY ? -1 : 1);
  const angle = (item.rotation * Math.PI) / 180;
  const vx =
    sx * ITEM_WIDTH * Math.cos(angle) - sy * ITEM_HEIGHT * Math.sin(angle);
  const vy =
    sx * ITEM_WIDTH * Math.sin(angle) + sy * ITEM_HEIGHT * Math.cos(angle);
  const scale = clamp(
    item.scale + (dx * vx + dy * vy) / (vx * vx + vy * vy),
    0.15,
    4,
  );
  const delta = scale - item.scale;
  return {
    scale,
    x: item.x + (((vx - ITEM_WIDTH) * delta) / 2 / WIDTH) * 100,
    y: item.y + (((vy - ITEM_HEIGHT) * delta) / 2 / HEIGHT) * 100,
  };
}

export function serializeScene(scene: Scene): string {
  return JSON.stringify({
    version: 2,
    baseBg: scene.baseBg,
    items: scene.items.map(({ asset, ...it }) => ({
      ...it,
      assetId: asset.id,
    })),
  });
}

export function restoreScene(
  raw: string,
  catalog: Asset[],
  backgrounds: Background[],
): Scene {
  const data = JSON.parse(raw);
  if (
    !data ||
    !Array.isArray(data.items) ||
    data.items.length > 1000 ||
    !data.baseBg
  )
    throw new Error("Invalid scene");
  const baseBg = backgrounds.find((bg) =>
    data.baseBg.src
      ? bg.src === data.baseBg.src
      : bg.name === data.baseBg.name ||
        bg.name === data.baseBg.name + " Colors",
  );
  if (!baseBg) throw new Error("Unknown background");
  const used = new Set<string>();
  const finite = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? clamp(v, min, max) : fallback;
  const items: Item[] = data.items.map(
    (it: Record<string, unknown>, index: number) => {
      if (!it || typeof it !== "object") throw new Error("Invalid element");
      const oldAsset = it.asset as Partial<Asset> | undefined;
      const asset =
        typeof it.assetId === "string"
          ? catalog.find((a) => a.id === it.assetId)
          : catalog.find((a) => a.src === oldAsset?.src);
      if (!asset || asset.type === "background")
        throw new Error("Unknown element");
      const uid =
        typeof it.uid === "string" && it.uid && !used.has(it.uid)
          ? it.uid
          : `restored-${index}`;
      if (used.has(uid)) throw new Error("Duplicate element");
      used.add(uid);
      return {
        uid,
        asset,
        x: finite(it.x, 40, -200, 200),
        y: finite(it.y, 50, -200, 200),
        scale: finite(it.scale, 0.5, 0.15, 4),
        rotation: normalizeRotation(finite(it.rotation, 0, -3600, 3600)),
        z: finite(it.z, index + 1, 1, 10000),
        locked: it.locked === true,
        flipX: it.flipX === true,
        flipY: it.flipY === true,
        opacity: finite(it.opacity, 1, 0.1, 1),
        hue: finite(it.hue, 0, 0, 360),
      };
    },
  );
  return { baseBg, items };
}
