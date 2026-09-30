export const WIDTH = 1200;
export const HEIGHT = 800;
export const ITEM_WIDTH = 320;
export const ITEM_HEIGHT = 270;
export const HISTORY_LIMIT = 50;

export const CANVAS_SIZES = {
  landscape: { label: "Landscape", width: 1200, height: 800 },
  square: { label: "Square", width: 1080, height: 1080 },
  portrait: { label: "Portrait post", width: 1080, height: 1350 },
  wallpaper: { label: "Phone wallpaper", width: 1080, height: 1920 },
} as const;
export type CanvasSize = keyof typeof CANVAS_SIZES;
export const sceneDimensions = (scene: Scene) =>
  CANVAS_SIZES[scene.size ?? "landscape"];
export type PhotoCrop = { zoom: number; x: number; y: number };
export function photoCrop(value?: Partial<PhotoCrop>): PhotoCrop {
  const valid = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.max(min, Math.min(max, v))
      : fallback;
  return {
    zoom: valid(value?.zoom, 1, 1, 3),
    x: valid(value?.x, 50, 0, 100),
    y: valid(value?.y, 50, 0, 100),
  };
}
export function photoPlacement(
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  crop?: PhotoCrop,
) {
  const { zoom, x, y } = photoCrop(crop);
  const scale = Math.max(width / imageWidth, height / imageHeight) * zoom;
  const drawWidth = imageWidth * scale,
    drawHeight = imageHeight * scale;
  return {
    x: ((width - drawWidth) * x) / 100,
    y: ((height - drawHeight) * y) / 100,
    width: drawWidth,
    height: drawHeight,
  };
}

export type Asset = {
  id: string;
  type: string;
  variant: string;
  style: string;
  src: string;
  shape?: ShapeStyle;
  text?: TextStyle;
  photo?: boolean;
};
export const SHAPE_NAMES = ["Rectangle", "Rounded rectangle", "Square", "Circle", "Oval", "Triangle", "Diamond", "Star", "Arrow", "Line"] as const;
export type ShapeStyle = {
  kind: (typeof SHAPE_NAMES)[number];
  fill: string;
  stroke: string;
  strokeWidth: number;
  width?: number;
  height?: number;
};

export function shapeAsset(value: ShapeStyle): Asset {
  if (!SHAPE_NAMES.includes(value.kind) ||
      !/^(#[0-9a-f]{6}|transparent)$/i.test(value.fill) ||
      !/^#[0-9a-f]{6}$/i.test(value.stroke) ||
      !Number.isFinite(value.strokeWidth) || value.strokeWidth < 0 || value.strokeWidth > 20)
    throw new Error("Invalid shape");
  for (const dimension of [value.width, value.height]) {
    if (dimension !== undefined && (typeof dimension !== "number" || !Number.isFinite(dimension) || dimension < 32 || dimension > 1200)) throw new Error("Invalid shape dimensions");
  }
  const shape = { ...(value.width !== undefined ? { width: value.width } : {}), ...(value.height !== undefined ? { height: value.height } : {}), kind: value.kind, fill: value.fill, stroke: value.stroke, strokeWidth: value.strokeWidth };
  const geometry: Record<ShapeStyle["kind"], string> = {
    Rectangle: '<rect x="16" y="16" width="288" height="238"/>',
    "Rounded rectangle": '<rect x="16" y="16" width="288" height="238" rx="36"/>',
    Square: '<rect x="41" y="16" width="238" height="238"/>',
    Circle: '<circle cx="160" cy="135" r="119"/>',
    Oval: '<ellipse cx="160" cy="135" rx="144" ry="119"/>',
    Triangle: '<path d="M160 16 304 254H16Z"/>',
    Diamond: '<path d="M160 16 304 135 160 254 16 135Z"/>',
    Star: '<path d="m160 16 34 78 85 8-64 56 19 83-74-43-74 43 19-83-64-56 85-8Z"/>',
    Arrow: '<path d="M16 95H190V35L304 135 190 235V175H16Z"/>',
    Line: '<path d="M16 135H304"/>',
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${shape.width ?? ITEM_WIDTH}" height="${shape.height ?? ITEM_HEIGHT}" viewBox="0 0 320 270" preserveAspectRatio="none"><g fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" stroke-linejoin="round" stroke-linecap="round">${geometry[shape.kind]}</g></svg>`;
  return { id: "custom-shape", type: "shapes", variant: shape.kind, style: "custom", src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, shape };
}

export type TextStyle = { content: string; color: string; bold: boolean };

export function textAsset(value: TextStyle): Asset {
  if (
    typeof value.content !== "string" ||
    value.content.length > 240 ||
    !/^#[0-9a-f]{6}$/i.test(value.color) ||
    typeof value.bold !== "boolean"
  )
    throw new Error("Invalid text");
  const text = { content: value.content, color: value.color, bold: value.bold };
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
  const lines = text.content
    .split("\n")
    .flatMap((line) => {
      const chars = Array.from(line);
      return chars.length
        ? Array.from({ length: Math.ceil(chars.length / 20) }, (_, i) =>
            chars.slice(i * 20, i * 20 + 20).join(""),
          )
        : [""];
    })
    .slice(0, 8);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="270"><g fill="${text.color}" font-family="Arial, sans-serif" font-size="24" font-weight="${text.bold ? 700 : 400}" text-anchor="middle">${lines.map((line, i) => `<text x="160" y="${135 - (lines.length - 1) * 15 + i * 30}" textLength="${Math.max(1, Array.from(line).length * 14)}" lengthAdjust="spacingAndGlyphs">${escape(line)}</text>`).join("")}</g></svg>`;
  return {
    id: "custom-text",
    type: "text",
    variant: "Text",
    style: "custom",
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    text,
  };
}

export function photoAsset(src: unknown): Asset {
  if (
    typeof src !== "string" ||
    src.length > 2000000 ||
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src)
  )
    throw new Error("This photo is too large to save. Try a smaller image.");
  return {
    id: "uploaded-photo",
    type: "photo",
    variant: "Your photo",
    style: "custom",
    src,
    photo: true,
  };
}

export function photoBackground(src: unknown, crop?: PhotoCrop): Background {
  if (
    typeof src !== "string" ||
    src.length > 2000000 ||
    !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(src)
  )
    throw new Error("Invalid photo background");
  return {
    name: "Your photo",
    sky: "#ffffff",
    ground: "#ffffff",
    kind: "full",
    src,
    photo: true,
    ...(crop ? { crop: photoCrop(crop) } : {}),
  };
}

export type Background = {
  category?: string;
  name: string;
  description?: string;
  sky: string;
  ground: string;
  src?: string;
  kind?: "full" | "landscape";
  photo?: boolean;
  crop?: PhotoCrop;
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
  hidden?: boolean;
  z: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  hue: number;
};
export const itemDimensions = (item: Item) => ({
  width: (item.asset.shape?.width ?? ITEM_WIDTH) * item.scale,
  height: (item.asset.shape?.height ?? ITEM_HEIGHT) * item.scale,
});

// Place the dragged layer at the target's position in the stack.
export function moveLayer(scene: Scene, uid: string, targetUid: string): Scene {
  const sorted = [...scene.items].sort((a, b) => a.z - b.z);
  const from = sorted.findIndex((item) => item.uid === uid);
  const to = sorted.findIndex((item) => item.uid === targetUid);
  if (from < 0 || to < 0 || from === to || sorted[from].locked) return scene;
  const [item] = sorted.splice(from, 1);
  sorted.splice(to, 0, item);
  return { ...scene, items: sorted.map((entry, index) => ({ ...entry, z: index + 1 })) };
}

export type Scene = { baseBg: Background; items: Item[]; size?: CanvasSize };
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
  width = WIDTH,
  height = HEIGHT,
): Partial<Item> {
  const itemWidth = item.asset.shape?.width ?? ITEM_WIDTH;
  const itemHeight = item.asset.shape?.height ?? ITEM_HEIGHT;
  const sx = (corner.includes("e") ? 1 : -1) * (item.flipX ? -1 : 1);
  const sy = (corner.includes("s") ? 1 : -1) * (item.flipY ? -1 : 1);
  const angle = (item.rotation * Math.PI) / 180;
  const vx =
    sx * itemWidth * Math.cos(angle) - sy * itemHeight * Math.sin(angle);
  const vy =
    sx * itemWidth * Math.sin(angle) + sy * itemHeight * Math.cos(angle);
  const scale = clamp(
    item.scale + (dx * vx + dy * vy) / (vx * vx + vy * vy),
    0.15,
    4,
  );
  const delta = scale - item.scale;
  return {
    scale,
    x: item.x + (((vx - itemWidth) * delta) / 2 / width) * 100,
    y: item.y + (((vy - itemHeight) * delta) / 2 / height) * 100,
  };
}

export function serializeScene(scene: Scene): string {
  return JSON.stringify({
    version: 2,
    ...(scene.size ? { size: scene.size } : {}),
    baseBg: scene.baseBg,
    items: scene.items.map(({ asset, ...it }) => ({
      ...it,
      assetId: asset.id,
      ...(asset.shape ? { shape: asset.shape } : {}),
      ...(asset.text ? { text: asset.text } : {}),
      ...(asset.photo ? { photo: asset.src } : {}),
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
  const baseBg =
    data.baseBg.photo === true
      ? photoBackground(data.baseBg.src, data.baseBg.crop)
      : backgrounds.find((bg) =>
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
      const asset = it.shape
        ? shapeAsset(it.shape as ShapeStyle)
        : it.photo
        ? photoAsset(it.photo)
        : it.text
          ? textAsset(it.text as TextStyle)
          : typeof it.assetId === "string"
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
        ...(it.hidden === true ? { hidden: true } : {}),
        flipX: it.flipX === true,
        flipY: it.flipY === true,
        opacity: finite(it.opacity, 1, 0.1, 1),
        hue: finite(it.hue, 0, 0, 360),
      };
    },
  );
  if (
    data.size !== undefined &&
    (typeof data.size !== "string" || !Object.hasOwn(CANVAS_SIZES, data.size))
  )
    throw new Error("Unknown canvas size");
  return {
    baseBg,
    items,
    ...(data.size ? { size: data.size as CanvasSize } : {}),
  };
}
