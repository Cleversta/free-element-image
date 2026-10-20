"use client";

import Link from "next/link";
import EditorIcon from "./EditorIcon";
import { BLOB_NAMES, BLOB_COLORS } from "@/lib/blob-shapes";
import PublishDialog from "./PublishDialog";
import MyCreations from "./MyCreations";
import { getProject, listProjects, putProject } from "@/lib/projects";
import { projectThumbnail } from "@/lib/project-thumbnail";
import CanvasViewport from "./CanvasViewport";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { SCENE_MOODS, moodImage, type SceneMood } from "@/lib/scene-mood";
import {
  duplicateSelection,
  groupMembers,
  groupSelection,
  resizeGroup,
} from "@/lib/groups";
import assets from "@/data/assets.json";
import { matchingElements } from "@/lib/matching-elements";
import {
  editableBackground,
  sceneBackgroundKey,
  replaceBackground,
  adoptBackgroundLayers,
  unpackBackground,
} from "@/lib/editable-backgrounds";
import {
  backgrounds,
  savedBackgrounds,
  photoCanvasBackground,
} from "@/lib/backgrounds";
import {
  textAsset,
  TEXT_FONTS,
  textFontFamily,
  type TextFont,
  shapeAsset,
  SHAPE_NAMES,
  EFFECT_NAMES,
  itemDimensions,
  moveLayer,
  photoBackground,
  photoAsset,
  CANVAS_SIZES,
  sceneDimensions,
  photoCrop,
  photoPlacement,
  photoAdjustments,
  photoFilter,
  ITEM_WIDTH,
  ITEM_HEIGHT,
  clamp,
  backgroundKey,
  initialState,
  normalizeRotation,
  removeItem,
  reorderItem,
  resizeItem,
  restoreScene,
  sceneReducer,
  serializeScene,
  updateItem,
} from "@/lib/scene";
import type { Asset, Background, Item, Scene, CanvasSize } from "@/lib/scene";
import { renderScene } from "@/lib/export";
import { trackAnalyticsEvent } from "@/lib/analytics";

const aliases: Record<string, string> = {
  background: "backgrounds",
  tree: "trees",
  mountain: "mountains",
  building: "buildings",
  animal: "animals",
  character: "people",
  decoration: "decorations",
  effect: "effects",
  plant: "plants",
  structure: "structures",
  flower: "flowers",
  "small-tree": "small-trees",
  "garden-equipment": "garden-equipment",
  "village-prop": "village-props",
  gras: "grass",
};
const CAT_ORDER = [
  "mountains",
  "trees",
  "small-trees",
  "flowers",
  "grass",
  "plants",
  "bushes",
  "rocks",
  "buildings",
  "structures",
  "village-props",
  "garden-equipment",
  "decorations",
  "animals",
  "people",
  "vehicles",
  "water",
  "terrain",
  "effects",
  "sky",
];
const catOf = (asset: Asset) => aliases[asset.type] || asset.type;
const cats = CAT_ORDER.filter((category) =>
  assets.some((asset) => catOf(asset) === category),
);
const pretty = (value: string) =>
  value
    .replace(/\.svg$/i, "")
    .replace(/[_]+/g, "-")
    .replace(/[-_]+\d+$/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
const icon = (category: string) =>
  (
    ({
      mountains: "△",
      trees: "🌳",
      "small-trees": "🌱",
      flowers: "🌸",
      grass: "🌿",
      plants: "🍃",
      rocks: "◆",
      buildings: "⌂",
      structures: "▥",
      "village-props": "🪵",
      "garden-equipment": "🛠",
      decorations: "✦",
      animals: "🐄",
      people: "●",
      vehicles: "🚲",
      water: "≈",
      terrain: "◒",
      effects: "✧",
      sky: "☀",
    }) as Record<string, string>
  )[category] || "◇";
const pick = <T,>(values: T[]) =>
  values[Math.floor(Math.random() * values.length)];
const STORAGE_KEY = "freelement-scene";
const defaultScene: Scene = {
  baseBg:
    backgrounds.find((bg) => bg.name === "Alpine Mirror Lake") ||
    backgrounds[0],
  items: [],
};
type Section =
  | "backgrounds"
  | "elements"
  | "decorations"
  | "others"
  | "text"
  | "uploads"
  | "shapes"
  | "effects"
  | "draw";

export default function Generator({
  sharedScene,
  projectId,
  entryType,
  openCreations = false,
  photoMode: initialPhotoMode = false,
}: {
  sharedScene?: string;
  projectId?: string;
  entryType?: "starter";
  openCreations?: boolean;
  photoMode?: boolean;
}) {
  const [mobilePanel, setMobilePanel] = useState<
    "none" | "tools" | "properties"
  >("none");
  const [photoMode, setPhotoMode] = useState(initialPhotoMode);
  const startingScene: Scene = photoMode
    ? {
        ...defaultScene,
        baseBg: photoCanvasBackground,
      }
    : defaultScene;
  const [state, dispatch] = useReducer(
    sceneReducer,
    startingScene,
    initialState,
  );
  const storageKey = projectId
    ? `${STORAGE_KEY}-project-${projectId}`
    : sharedScene
      ? `${STORAGE_KEY}-copy-${Array.from(sharedScene).reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) | 0, 0) >>> 0}`
      : photoMode
        ? `${STORAGE_KEY}-photo-editor`
        : STORAGE_KEY;
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const backgroundPhotoInput = useRef<HTMLInputElement>(null);
  const { baseBg, items } = state.present;
  const { width: WIDTH, height: HEIGHT } = sceneDimensions(state.present);
  const [brushSpacing, setBrushSpacing] = useState(45);
  const [brushCursor, setBrushCursor] = useState<[number, number] | null>(null);
  const [brushKind, setBrushKind] = useState("Pen");
  const [brushColor, setBrushColor] = useState("#305f4e");
  const [brushSize, setBrushSize] = useState(8);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const drawStroke = useRef<{ id: number; points: [number, number][] } | null>(
    null,
  );
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [editingText, setEditingText] = useState<{
    uid: string;
    content: string;
  } | null>(null);
  const crop = photoCrop(baseBg.crop);
  const [photoDimensions, setPhotoDimensions] = useState({
    src: "",
    width: 1,
    height: 1,
  });
  const photoRect = photoPlacement(
    photoDimensions.width,
    photoDimensions.height,
    WIDTH,
    HEIGHT,
    crop,
  );
  const adjustments = photoAdjustments(baseBg.adjustments);
  const draggedLayer = useRef<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("backgrounds");
  const [backgroundCategory, setBackgroundCategory] = useState("All");
  const [backgroundSearch, setBackgroundSearch] = useState("");
  const filteredBackgrounds = backgrounds.filter(
    (bg) =>
      (backgroundCategory === "All" || bg.category === backgroundCategory) &&
      `${bg.name} ${bg.description ?? ""}`
        .toLowerCase()
        .includes(backgroundSearch.trim().toLowerCase()),
  );
  const [pickerCat, setPickerCat] = useState(cats[0]);
  const [search, setSearch] = useState("");
  const [downloadFormat, setDownloadFormat] = useState<"png" | "jpeg" | "webp">(
    "png",
  );
  const [downloadQuality, setDownloadQuality] = useState<number>(0.92);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState<boolean>(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(serializeScene(startingScene));
  const [ready, setReady] = useState(false);
  const editorStartTracked = useRef(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [publishScene, setPublishScene] = useState<Scene | null>(null);
  const [creationsOpen, setCreationsOpen] = useState(openCreations);
  const [savedProject, setSavedProject] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [savingCreation, setSavingCreation] = useState(false);
  const savingCreationRef = useRef(false);
  const saveToCreations = async () => {
    if (savingCreationRef.current || !ready) return;
    savingCreationRef.current = true;
    setSavingCreation(true);
    setNotice("Saving to My creations…");
    try {
      const snapshot = state.present;
      const raw = serializeScene(snapshot);
      const existing = savedProject
        ? await getProject(savedProject.id)
        : (await listProjects()).find(
            (project) => project.name === "My village" && project.scene === raw,
          );
      const project = {
        id: existing?.id || crypto.randomUUID(),
        name: existing?.name || "My village",
        scene: raw,
        updatedAt: Date.now(),
        thumbnail: await projectThumbnail(snapshot),
      };
      await putProject(project);
      rememberProject({ id: project.id, name: project.name });
      setNotice(`Saved to My creations as “${project.name}”.`);
    } catch {
      setNotice(
        "Could not save to My creations. Browser storage may be full or unavailable. Your scene is still open.",
      );
    } finally {
      savingCreationRef.current = false;
      setSavingCreation(false);
    }
  };
  const rememberProject = (project: { id: string; name: string } | null) => {
    setSavedProject(project);
    try {
      if (project) localStorage.setItem(`${storageKey}-project-id`, project.id);
      else localStorage.setItem(`${storageKey}-project-id`, "");
    } catch {
      /* Named scenes still save when draft storage is unavailable. */
    }
  };
  const exportingRef = useRef(false);
  const board = useRef<HTMLDivElement>(null);
  const pointerCleanup = useRef<(() => void) | null>(null);
  const groups = useMemo(
    () =>
      Object.fromEntries(
        cats.map((category) => [
          category,
          assets.filter((asset) => catOf(asset) === category),
        ]),
      ),
    [],
  );
  const brushAssets = assets.filter((asset) =>
    brushKind === "Flowers"
      ? asset.style === "freeimage" && asset.type === "flower"
      : brushKind === "Grass"
        ? /grass/.test(asset.variant) && !/potted/.test(asset.variant)
        : asset.type === "sky" && /cloud/.test(asset.variant),
  );
  const stampBrush = ["Flowers", "Grass", "Clouds"].includes(brushKind);
  const previewScale = Math.max(
    0.15,
    ((brushKind === "Clouds" ? 0.45 : 0.2) * brushSize) / 8,
  );
  const matching = matchingElements(baseBg);
  const current = items.find((item) => item.uid === active) || null;
  const [sizeInput, setSizeInput] = useState<string>("");
  const [rotationInput, setRotationInput] = useState<string>("");
  const [opacityInput, setOpacityInput] = useState<string>("");
  const filtered = useMemo(
    () =>
      (groups[pickerCat] || []).filter((asset) =>
        pretty(asset.variant || asset.id)
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [groups, pickerCat, search],
  );
  const dirty = serializeScene(state.present) !== saved;
  useEffect(() => {
    try {
      setWelcomeDismissed(
        localStorage.getItem("freelement-welcome-complete") === "1",
      );
    } catch {
      setWelcomeDismissed(false);
    }
  }, []);
  const finishWelcome = () => {
    setWelcomeDismissed(true);
    try {
      localStorage.setItem("freelement-welcome-complete", "1");
    } catch {
      /* The editor remains usable without storage. */
    }
  };
  const onboardingScenes = backgrounds
    .filter((background) => editableBackground(background))
    .slice(0, 3);
  const personalElements = items.filter((item) => !item.backgroundScene).length;
  const welcomeStep = personalElements
    ? 3
    : editableBackground(baseBg) && items.length
      ? 2
      : 1;

  const change = (apply: (scene: Scene) => Scene) => {
    setNotice("");
    dispatch({ type: "change", apply });
  };

  const confirmDownload = async () => {
    setDownloadDialogOpen(false);
    await download();
  };

  // Close popup on outside click or Escape
  useEffect(() => {
    if (!downloadDialogOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDownloadDialogOpen(false);
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (
        popupRef.current &&
        downloadRef.current &&
        target &&
        !popupRef.current.contains(target) &&
        !downloadRef.current.contains(target)
      ) {
        setDownloadDialogOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onClick);
    };
  }, [downloadDialogOpen]);

  useEffect(() => {
    if (!current) {
      setSizeInput("");
      setRotationInput("");
      setOpacityInput("");
      return;
    }
    setSizeInput(String(Math.round(current.scale * 100)));
    setRotationInput(String(Math.round(current.rotation)));
    setOpacityInput(String(Math.round(current.opacity * 100)));
  }, [current]);
  const update = (uid: string, patch: Partial<Item>) =>
    change((scene) => updateItem(scene, uid, patch));
  const undo = () => {
    dispatch({ type: "undo" });
    setActive(null);
    setNotice("");
  };
  const redo = () => {
    dispatch({ type: "redo" });
    setActive(null);
    setNotice("");
  };
  const chooseBackground = (background: Background) => {
    change((scene) =>
      replaceBackground(scene, background, () => crypto.randomUUID()),
    );
    setActive(null);
  };
  const clear = () => {
    change((scene) => (scene.items.length ? { ...scene, items: [] } : scene));
    setActive(null);
  };
  const newScene = () => {
    rememberProject(null);
    change(() => ({ ...startingScene, items: [] }));
    setActive(null);
  };
  const positionFor = (category: string) => {
    let x = 36 + Math.random() * 20,
      y = 60,
      scale = 0.65;
    if (category === "mountains") {
      x = 30;
      y = 24;
      scale = 1.5;
    }
    if (category === "buildings") {
      y = 38;
      scale = 1;
    }
    if (category === "trees") {
      y = 30;
      scale = 1.1;
    }
    if (category === "small-trees") {
      y = 46;
      scale = 0.7;
    }
    if (
      [
        "flowers",
        "grass",
        "plants",
        "garden-equipment",
        "village-props",
        "decorations",
        "rocks",
      ].includes(category)
    ) {
      y = 65;
      scale = 0.5;
    }
    if (category === "animals" || category === "people") {
      y = 59;
      scale = 0.65;
    }
    if (category === "sky" || category === "effects") {
      x = 24 + Math.random() * 45;
      y = 8;
      scale = 0.6;
    }
    return { x, y, scale };
  };
  const makeItem = (asset: Asset): Item => ({
    uid: crypto.randomUUID(),
    asset,
    ...positionFor(catOf(asset)),
    rotation: 0,
    locked: false,
    z: 1,
    flipX: false,
    flipY: false,
    opacity: 1,
    hue: 0,
  });
  const addAsset = (asset: Asset) => {
    setMobilePanel("none");
    const item = makeItem(asset);
    if (asset.photo || asset.shape) {
      item.scale = 1;
      item.x = (1 - ITEM_WIDTH / WIDTH) * 50;
      item.y = (1 - ITEM_HEIGHT / HEIGHT) * 50;
    }
    change((scene) => ({
      ...scene,
      items: [
        ...scene.items,
        { ...item, z: Math.max(0, ...scene.items.map((it) => it.z)) + 1 },
      ],
    }));
    setActive(item.uid);
  };
  const remove = (uid: string) => change((scene) => removeItem(scene, uid));
  const duplicate = (item: Item) => {
    if (item.groupId) {
      const members = groupMembers(state.present, item);
      const groupId = crypto.randomUUID();
      change((scene) => ({
        ...scene,
        items: [
          ...scene.items,
          ...members.map((entry, index) => ({
            ...entry,
            uid: crypto.randomUUID(),
            groupId,
            backgroundScene: undefined,
            locked: false,
            x: entry.x + 3,
            y: entry.y + 3,
            z: Math.max(0, ...scene.items.map((layer) => layer.z)) + index + 1,
          })),
        ],
      }));
      return;
    }
    const copy = {
      ...item,
      uid: crypto.randomUUID(),
      x: clamp(item.x + 3, -20, 90),
      y: clamp(item.y + 3, -20, 90),
      locked: false,
    };
    change((scene) => ({
      ...scene,
      items: [
        ...scene.items,
        { ...copy, z: Math.max(0, ...scene.items.map((it) => it.z)) + 1 },
      ],
    }));
    setActive(copy.uid);
  };
  const layer = (item: Item, mode: "up" | "down" | "front" | "back") =>
    change((scene) => reorderItem(scene, item.uid, mode));
  const rotateDirect = (uid: string, delta: number) =>
    change((scene) => {
      const item = scene.items.find((it) => it.uid === uid);
      return item
        ? updateItem(scene, uid, {
            rotation: normalizeRotation(item.rotation + delta),
          })
        : scene;
    });
  const setNumericValue = (
    uid: string,
    key: "scale" | "rotation" | "opacity" | "hue",
    rawValue: number,
    min: number,
    max: number,
  ) => {
    const nextValue = Number(rawValue);
    if (!Number.isFinite(nextValue)) return;
    const clamped = clamp(nextValue, min, max);
    update(uid, { [key]: clamped } as Partial<Item>);
    // keep local inputs in sync after committing
    if (key === "scale")
      setSizeInput(String(Math.round((clamped as number) * 100)));
    if (key === "rotation")
      setRotationInput(String(Math.round(clamped as number)));
    if (key === "opacity")
      setOpacityInput(String(Math.round((clamped as number) * 100)));
  };

  const beginPointer = (
    event: React.PointerEvent,
    move: (event: PointerEvent) => void,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    pointerCleanup.current?.();
    dispatch({ type: "begin" });
    const pointerId = event.pointerId;
    let pendingMove: PointerEvent | null = null;
    let moveFrame = 0;
    const flushMove = () => {
      moveFrame = 0;
      const pending = pendingMove;
      pendingMove = null;
      if (pending) move(pending);
    };
    const onMove = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      pendingMove = next;
      if (!moveFrame) moveFrame = window.requestAnimationFrame(flushMove);
    };
    const cleanup = () => {
      if (moveFrame) window.cancelAnimationFrame(moveFrame);
      moveFrame = 0;
      pendingMove = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", blur);
      pointerCleanup.current = null;
    };
    const finish = (next: PointerEvent) => {
      if (next.pointerId === pointerId) {
        if (moveFrame) window.cancelAnimationFrame(moveFrame);
        moveFrame = 0;
        flushMove();
        dispatch({ type: "end" });
        cleanup();
      }
    };
    const cancel = (next: PointerEvent) => {
      if (next.pointerId === pointerId) {
        dispatch({ type: "cancel" });
        cleanup();
      }
    };
    const blur = () => {
      flushMove();
      dispatch({ type: "end" });
      cleanup();
    };
    pointerCleanup.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", blur);
  };
  const down = (event: React.PointerEvent, item: Item) => {
    setMobilePanel("properties");
    event.stopPropagation();
    setActive(item.uid);
    if (item.locked || !board.current || event.button !== 0) return;
    const rect = board.current.getBoundingClientRect();
    const startX = event.clientX,
      startY = event.clientY;
    if (
      item.groupId ||
      (selectedIds.includes(item.uid) && selectedIds.length > 1)
    ) {
      const moving = item.groupId
        ? groupMembers(state.present, item)
        : items.filter((entry) => selectedIds.includes(entry.uid));
      if (moving.some((entry) => entry.locked)) return;
      const movingById = new Map(moving.map((entry) => [entry.uid, entry]));
      beginPointer(event, (next) =>
        change((scene) => ({
          ...scene,
          items: scene.items.map((entry) => {
            const original = movingById.get(entry.uid);
            return original
              ? {
                  ...entry,
                  x: original.x + ((next.clientX - startX) / rect.width) * 100,
                  y: original.y + ((next.clientY - startY) / rect.height) * 100,
                }
              : entry;
          }),
        })),
      );
      return;
    }
    beginPointer(event, (next) =>
      update(item.uid, {
        x: clamp(
          item.x + ((next.clientX - startX) / rect.width) * 100,
          -20,
          95,
        ),
        y: clamp(
          item.y + ((next.clientY - startY) / rect.height) * 100,
          -20,
          95,
        ),
      }),
    );
  };
  const resizeDown = (
    event: React.PointerEvent,
    item: Item,
    corner: string,
  ) => {
    if (item.locked || !board.current || event.button !== 0) return;
    const rect = board.current.getBoundingClientRect();
    const startX = event.clientX,
      startY = event.clientY;
    if (item.groupId) {
      const members = groupMembers(state.present, item);
      if (members.some((entry) => entry.locked)) return;
      beginPointer(event, (next) => {
        const patch = resizeItem(
          item,
          corner,
          ((next.clientX - startX) / rect.width) * WIDTH,
          ((next.clientY - startY) / rect.height) * HEIGHT,
          WIDTH,
          HEIGHT,
        );
        change((scene) => resizeGroup(scene, members, { ...item, ...patch }));
      });
      return;
    }
    beginPointer(event, (next) =>
      update(
        item.uid,
        resizeItem(
          item,
          corner,
          ((next.clientX - startX) / rect.width) * WIDTH,
          ((next.clientY - startY) / rect.height) * HEIGHT,
          WIDTH,
          HEIGHT,
        ),
      ),
    );
  };
  const beginRange = () => dispatch({ type: "begin" });
  useEffect(() => {
    const finish = () => dispatch({ type: "end" });
    const cancel = () => dispatch({ type: "cancel" });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", finish);
    return () => {
      pointerCleanup.current?.();
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", finish);
    };
  }, []);

  const randomScene = () => {
    const out: Item[] = [];
    const addFrom = (category: string, positions: number[]) => {
      const pool = groups[category] || [];
      if (!pool.length) return;
      for (const x of positions) {
        const item = makeItem(pick(pool));
        out.push({
          ...item,
          x: x + Math.random() * 4 - 2,
          y: item.y + Math.random() * 4 - 2,
          scale: item.scale * (0.9 + Math.random() * 0.2),
          z: out.length + 1,
        });
      }
    };
    // Full scene backgrounds already contain their own sun, moon, and clouds.
    addFrom("trees", [4, 73]);
    addFrom("buildings", [38]);
    addFrom("small-trees", [22, 66]);
    addFrom("animals", [53]);
    addFrom("village-props", [32]);
    addFrom("garden-equipment", [61]);
    addFrom("grass", [9, 42, 78]);
    addFrom("flowers", [19, 39, 84]);
    change((scene) =>
      unpackBackground(
        {
          ...scene,
          baseBg: pick(backgrounds.filter((bg) => bg.kind === "full")),
          items: out,
        },
        () => crypto.randomUUID(),
      ),
    );
    setActive(null);
  };
  const save = () => {
    try {
      const value = serializeScene(state.present);
      localStorage.setItem(storageKey, value);
      setSaved(value);
      setNotice("Saved in this browser.");
    } catch {
      setNotice(
        "Could not save. Browser storage may be full or unavailable. Your scene is still open.",
      );
    }
  };
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const project = projectId ? await getProject(projectId) : undefined;
        const linkedId = localStorage.getItem(`${storageKey}-project-id`);
        const linkedProject =
          linkedId !== null
            ? linkedId
              ? await getProject(linkedId)
              : undefined
            : project;
        if (cancelled) return;
        setSavedProject(
          linkedProject
            ? { id: linkedProject.id, name: linkedProject.name }
            : null,
        );
        if (projectId && !project) {
          setNotice(
            "This saved scene isn’t available in this browser. Open My creations to choose another scene.",
          );
          setReady(true);
          return;
        }
        const raw =
          localStorage.getItem(storageKey) || project?.scene || sharedScene;
        if (raw) {
          const scene = unpackBackground(
            adoptBackgroundLayers(restoreScene(raw, assets, savedBackgrounds)),
            () => crypto.randomUUID(),
          );
          if (
            (projectId || sharedScene) &&
            (scene.baseBg.photo || scene.baseBg.name === "Photo canvas")
          )
            setPhotoMode(true);
          dispatch({ type: "load", scene });
          setSaved(serializeScene(scene));
          setNotice(
            project
              ? `Opened ${project.name}. Your edits autosave here. Use My creations to update the saved copy.`
              : sharedScene
                ? "Editing a copy. Your saved scene stays unchanged while this copy autosaves separately."
                : "Your saved scene is ready.",
          );
        }
      } catch {
        if (!cancelled)
          setNotice(
            "Your saved scene could not be loaded. You can still create a new scene.",
          );
      }
      if (!cancelled) setReady(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [sharedScene, storageKey, projectId]);
  useEffect(() => {
    if (!ready || editorStartTracked.current) return;
    editorStartTracked.current = true;
    trackAnalyticsEvent("editor_started", {
      mode: photoMode ? "photo" : "scene",
      entry:
        entryType ||
        (projectId
          ? "saved_project"
          : sharedScene
            ? "shared_scene"
            : "new_scene"),
    });
  }, [ready, photoMode, entryType, projectId, sharedScene]);
  useEffect(() => {
    if (!ready || !dirty || state.gesture) return;
    const persist = () => {
      try {
        const value = serializeScene(state.present);
        localStorage.setItem(storageKey, value);
        setSaved(value);
      } catch {
        setNotice(
          "Autosave failed: browser storage is full or unavailable. Download your scene to keep a copy.",
        );
      }
    };
    const timer = window.setTimeout(persist, 700);
    window.addEventListener("pagehide", persist);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [ready, dirty, state.present, state.gesture, storageKey]);

  const uploadPhoto = async (file?: File, asBackground = false) => {
    if (!file) return;
    setUploading(true);
    let url = "";
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 15 * 1024 * 1024
      )
        throw new Error("Choose a JPG, PNG, or WebP photo smaller than 15 MB.");
      url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      // Keep the whole photo so later crops and aspect changes are reversible.
      const scale = Math.min(
        1,
        1920 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Photo upload is unavailable in this browser.");
      if (asBackground) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const format = asBackground ? "image/jpeg" : "image/webp";
      let src = canvas.toDataURL(format, 0.8);
      if (src.length > 2000000) src = canvas.toDataURL(format, 0.55);
      if (asBackground) {
        const background = photoBackground(src);
        if (photoMode) {
          const ratio = image.naturalWidth / image.naturalHeight;
          const size = (Object.keys(CANVAS_SIZES) as CanvasSize[]).sort(
            (a, b) =>
              Math.abs(
                Math.log(
                  ratio / (CANVAS_SIZES[a].width / CANVAS_SIZES[a].height),
                ),
              ) -
              Math.abs(
                Math.log(
                  ratio / (CANVAS_SIZES[b].width / CANVAS_SIZES[b].height),
                ),
              ),
          )[0];
          change((scene) => ({ ...scene, baseBg: background, size }));
        } else chooseBackground(background);
      } else addAsset(photoAsset(src));
      setNotice(
        asBackground
          ? "Photo added. Adjust the crop and colors, add elements, or publish it for review."
          : "Photo added. Drag it to move, use the corners to resize, or adjust it in Element Properties.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not open this photo.",
      );
    } finally {
      if (url) URL.revokeObjectURL(url);
      setUploading(false);
    }
  };
  const download = async () => {
    if (exportingRef.current) return;
    const exportStartedAt = performance.now();
    exportingRef.current = true;
    setExporting(true);
    setNotice(`Preparing your ${downloadFormat.toUpperCase()}…`);
    try {
      const blob = await renderScene(
        state.present,
        downloadFormat === "png"
          ? "image/png"
          : downloadFormat === "jpeg"
            ? "image/jpeg"
            : "image/webp",
        downloadQuality,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `freelement-village.${downloadFormat === "png" ? "png" : downloadFormat === "jpeg" ? "jpg" : "webp"}`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      trackAnalyticsEvent("scene_downloaded", {
        format: downloadFormat,
        width: WIDTH,
        height: HEIGHT,
        elements: state.present.items.length,
        mode: photoMode ? "photo" : "scene",
        render_ms: Math.round(performance.now() - exportStartedAt),
      });
      setNotice(
        `${downloadFormat.toUpperCase()} downloaded (${WIDTH} × ${HEIGHT}).`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Image export failed. Please try again.",
      );
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest("input, select, textarea") ||
          event.target.isContentEditable)
      )
        return;
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      } else if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (command && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (command && event.key.toLowerCase() === "d" && current) {
        event.preventDefault();
        duplicate(current);
      } else if (event.key === "Escape") {
        dispatch({ type: "cancel" });
        pointerCleanup.current?.();
        setActive(null);
      } else if (current && !current.locked) {
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          remove(current.uid);
        }
        const step = event.shiftKey ? 10 : 1;
        const delta = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        }[event.key];
        if (delta) {
          event.preventDefault();
          update(current.uid, {
            x: clamp(current.x + (delta[0] / WIDTH) * 100, -20, 95),
            y: clamp(current.y + (delta[1] / HEIGHT) * 100, -20, 95),
          });
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const sectionCats =
    section === "elements"
      ? cats.filter((category) =>
          [
            "mountains",
            "trees",
            "small-trees",
            "flowers",
            "grass",
            "plants",
            "bushes",
            "rocks",
            "buildings",
            "structures",
            "animals",
            "people",
            "vehicles",
            "water",
          ].includes(category),
        )
      : section === "decorations"
        ? cats.filter((category) =>
            [
              "garden-equipment",
              "village-props",
              "decorations",
              "effects",
            ].includes(category),
          )
        : section === "others"
          ? cats.filter((category) =>
              ["terrain", "sky", "water", "effects"].includes(category),
            )
          : [];
  const selectSection = (next: Section) => {
    setMobilePanel("tools");
    setSection(next);
    setSearch("");
    if (next === "elements") setPickerCat("trees");
    if (next === "decorations") setPickerCat("garden-equipment");
    if (next === "others") setPickerCat("sky");
  };
  return (
    <main className="villageStudio">
      {creationsOpen && (
        <MyCreations
          scene={state.present}
          activeProject={savedProject}
          onSaved={rememberProject}
          onClose={() => setCreationsOpen(false)}
          onOpen={(scene, name, id) => {
            rememberProject({ id, name });
            change(() =>
              unpackBackground(adoptBackgroundLayers(scene), () =>
                crypto.randomUUID(),
              ),
            );
            setActive(null);
            setNotice(
              `Opened ${name}. Undo returns to your previous working scene.`,
            );
          }}
        />
      )}
      {publishScene && (
        <PublishDialog
          scene={publishScene}
          onClose={() => setPublishScene(null)}
        />
      )}
      <header className={`vTop${photoMode ? " photoEditorHeader" : ""}`}>
        <Link href="/" className="vBrand">
          <img
            className="editorLogo"
            src="/logo.png"
            alt=""
            width={48}
            height={48}
          />
          <div>
            <b>Freelement Images</b>
            <small>
              {photoMode
                ? "Edit a photo and make it yours"
                : "Build a village scene your way"}
            </small>
          </div>
        </Link>
        <div className="vActions">
          <button
            className="iconAction"
            disabled={!state.past.length}
            onClick={undo}
            title="Undo"
            aria-label="Undo"
          >
            ↶
          </button>
          <button
            className="iconAction"
            disabled={!state.future.length}
            onClick={redo}
            title="Redo"
            aria-label="Redo"
          >
            ↷
          </button>
          <button
            className={photoMode ? "editorIconButton" : undefined}
            aria-label={photoMode ? "New photo" : "⊕ New"}
            title="New photo"
            disabled={savingCreation}
            onClick={newScene}
          >
            {photoMode ? <EditorIcon name="new" /> : "⊕ New"}
          </button>
          {!photoMode && <button onClick={randomScene}>⟳ Random</button>}
          <button
            disabled={!ready}
            onClick={() => setPublishScene(state.present)}
          >
            Publish
          </button>
          <button
            className="saveCreation"
            disabled={!ready || savingCreation}
            onClick={() => void saveToCreations()}
          >
            Save to My creations
          </button>
          <button
            disabled={!ready || savingCreation}
            className="editorIconButton"
            aria-label="My creations"
            title="My creations"
            onClick={() => setCreationsOpen(true)}
          >
            <EditorIcon name="folder" />
          </button>
          <div className="downloadWrap" ref={downloadRef}>
            <button
              className="download editorIconButton"
              aria-label={exporting ? "Exporting…" : "⇩ Download"}
              title="Download"
              disabled={exporting || !ready}
              onClick={() => setDownloadDialogOpen((s) => !s)}
            >
              {exporting ? "…" : <EditorIcon name="download" />}
            </button>
            {downloadDialogOpen && (
              <div
                className="popupMenu"
                role="menu"
                aria-label="Download options"
                ref={popupRef}
              >
                <div className="popupRow">
                  <label>Format</label>
                  <select
                    value={downloadFormat}
                    onChange={(e) =>
                      setDownloadFormat(
                        e.target.value as "png" | "jpeg" | "webp",
                      )
                    }
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>
                {downloadFormat !== "png" && (
                  <div className="popupRow">
                    <label>Quality</label>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.01}
                      value={downloadQuality}
                      onChange={(e) =>
                        setDownloadQuality(Number(e.target.value))
                      }
                    />
                  </div>
                )}
                <div className="popupActions">
                  <button
                    className="btnAlt"
                    onClick={() => setDownloadDialogOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="btnPrimary" onClick={confirmDownload}>
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload photo as an object"
        hidden
        onChange={(e) => {
          void uploadPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={backgroundPhotoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload photo background"
        hidden
        onChange={(e) => {
          void uploadPhoto(e.target.files?.[0], true);
          e.target.value = "";
        }}
      />
      <div className="sceneStatus">
        <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <span role="status" aria-live="polite">
          {notice}
        </span>
      </div>
      <nav className="mobileEditorDock" aria-label="Mobile editor panels">
        <button
          aria-pressed={mobilePanel === "none"}
          onClick={() => setMobilePanel("none")}
        >
          Canvas
        </button>
        <button
          aria-pressed={mobilePanel === "tools"}
          onClick={() => setMobilePanel("tools")}
        >
          Tools
        </button>
        <button
          aria-pressed={mobilePanel === "properties"}
          onClick={() => setMobilePanel("properties")}
        >
          Layers & properties
        </button>
      </nav>
      <div className="vWorkspace">
        <aside className={`vLeft mobilePanel-${mobilePanel}`}>
          <div className="bigTabs">
            <button
              aria-label={photoMode ? "Photo" : "Backgrounds"}
              aria-pressed={section === "backgrounds"}
              className={section === "backgrounds" ? "on" : ""}
              onClick={() => selectSection("backgrounds")}
            >
              ▣<span>{photoMode ? "Photo" : "Backgrounds"}</span>
            </button>
            <button
              aria-pressed={section === "elements"}
              className={section === "elements" ? "on" : ""}
              onClick={() => selectSection("elements")}
            >
              ◇<span>Objects</span>
            </button>
            <button
              aria-label="Shapes"
              aria-pressed={section === "shapes"}
              className={section === "shapes" ? "on" : ""}
              onClick={() => selectSection("shapes")}
            >
              ◯<span>Shapes</span>
            </button>
            <button
              aria-label="Effects"
              aria-pressed={section === "effects"}
              className={section === "effects" ? "on" : ""}
              onClick={() => selectSection("effects")}
            >
              ✦<span>Effects</span>
            </button>
            <button
              aria-label="Draw"
              aria-pressed={section === "draw"}
              className={section === "draw" ? "on" : ""}
              onClick={() => {
                setEditingPhoto(false);
                setActive(null);
                selectSection("draw");
              }}
            >
              ✎<span>Draw</span>
            </button>
            <button
              aria-label="Text"
              aria-pressed={section === "text"}
              className={section === "text" ? "on" : ""}
              onClick={() => selectSection("text")}
            >
              T<span>Text</span>
            </button>
            <button
              aria-label="Upload image"
              aria-pressed={section === "uploads"}
              className={section === "uploads" ? "on" : ""}
              onClick={() => selectSection("uploads")}
            >
              ↑<span>Upload image</span>
            </button>
            <button
              aria-pressed={section === "decorations"}
              className={section === "decorations" ? "on" : ""}
              onClick={() => selectSection("decorations")}
            >
              ✧<span>Village</span>
            </button>
            <button
              aria-pressed={section === "others"}
              className={section === "others" ? "on" : ""}
              onClick={() => selectSection("others")}
            >
              ⊙<span>More</span>
            </button>
          </div>
          {section === "draw" ? (
            <section className="creationPanel" aria-label="Drawing tools">
              <div className="panelTitle">
                <b>Draw</b>
              </div>
              <p>
                Draw directly on the canvas. Each stroke becomes an editable
                layer.
              </p>
              <label>
                Brush
                <select
                  aria-label="Brush type"
                  value={brushKind}
                  onChange={(event) => setBrushKind(event.target.value)}
                >
                  {["Pen", "Path", "Flowers", "Grass", "Clouds"].map((kind) => (
                    <option key={kind}>{kind}</option>
                  ))}
                </select>
              </label>
              <label>
                Brush color{" "}
                <input
                  type="color"
                  aria-label="Brush color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                />
              </label>
              <label>
                Brush size{" "}
                <input
                  type="range"
                  aria-label="Brush size"
                  min="2"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(+e.target.value)}
                />
                <output>{brushSize} px</output>
              </label>
              {stampBrush && (
                <label>
                  Spacing
                  <input
                    type="range"
                    aria-label="Brush spacing"
                    min="20"
                    max="150"
                    value={brushSpacing}
                    onChange={(event) => setBrushSpacing(+event.target.value)}
                  />
                  <output>{brushSpacing} px</output>
                </label>
              )}
              <button onClick={() => selectSection("elements")}>
                Done drawing
              </button>
              <p>
                Use Undo to remove a stroke. Select a drawing after finishing to
                move, resize, recolor, or delete it.
              </p>
            </section>
          ) : section === "shapes" || section === "effects" ? (
            <section
              className="creationPanel"
              aria-label={
                section === "effects" ? "Effect tools" : "Shape tools"
              }
            >
              <div className="panelTitle">
                <b>{section === "effects" ? "Effects" : "Shapes"}</b>
              </div>
              <p>
                Add shapes, blobs, sparkles, glows, and decorative effects.
                Customize their colors and opacity in either editor.
              </p>
              {(section === "effects"
                ? [{ title: "Decorative effects", kinds: [...EFFECT_NAMES] }]
                : [
                    {
                      title: "Blobs",
                      kinds: SHAPE_NAMES.filter(
                        (kind) =>
                          kind === "Blob" ||
                          kind === "Organic blob" ||
                          BLOB_NAMES.includes(
                            kind as (typeof BLOB_NAMES)[number],
                          ),
                      ),
                    },
                    {
                      title: "Basic shapes",
                      kinds: SHAPE_NAMES.filter(
                        (kind) =>
                          kind !== "Drawing" &&
                          !EFFECT_NAMES.includes(
                            kind as (typeof EFFECT_NAMES)[number],
                          ) &&
                          kind !== "Blob" &&
                          kind !== "Organic blob" &&
                          !BLOB_NAMES.includes(
                            kind as (typeof BLOB_NAMES)[number],
                          ),
                      ),
                    },
                  ]
              ).map((group) => (
                <div key={group.title} className="shapeCollection">
                  <h3>
                    {group.title} <small>{group.kinds.length}</small>
                  </h3>
                  <div className="shapeGrid">
                    {group.kinds.map((kind, index) => {
                      const asset = shapeAsset({
                        kind,
                        fill:
                          group.title === "Blobs"
                            ? BLOB_COLORS[index % BLOB_COLORS.length]
                            : kind === "Soft glow"
                              ? "#ffc76b"
                              : kind === "Gradient orb"
                                ? "#a98ae8"
                                : "#438568",
                        stroke: "#183c2c",
                        strokeWidth: kind === "Line" ? 6 : 0,
                      });
                      return (
                        <button
                          key={kind}
                          disabled={!ready}
                          aria-label={`Add ${kind.toLowerCase()}`}
                          onClick={() => addAsset(asset)}
                        >
                          <img src={asset.src} alt="" />
                          <span>{kind}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="creationHint">
                Drag to move. Use the corners to resize, and Element Properties
                to style.
              </p>
            </section>
          ) : section === "text" ? (
            <section className="creationPanel" aria-label="Text tools">
              <div className="panelTitle">
                <b>Text</b>
              </div>
              <p>
                Add a title or caption, then select it to change the words,
                color, and style.
              </p>
              <button
                className="creationPrimary"
                disabled={!ready}
                onClick={() =>
                  addAsset(
                    textAsset({
                      content: "Your text",
                      color: "#183c2c",
                      bold: true,
                    }),
                  )
                }
              >
                Add text
              </button>
              <p className="creationHint">
                Drag to move it. Use the corners to resize it.
              </p>
            </section>
          ) : section === "uploads" ? (
            <section className="creationPanel" aria-label="Image upload tools">
              <div className="panelTitle">
                <b>Your images</b>
              </div>
              <p>
                Add a photo from your device as an object you can move and
                resize.
              </p>
              <button
                className="creationPrimary"
                disabled={!ready || uploading}
                onClick={() => photoInput.current?.click()}
              >
                {uploading ? "Opening image…" : "Choose image"}
              </button>
              <p className="creationHint">
                JPG, PNG, or WebP · up to 15 MB. Transparent images keep their
                transparency.
              </p>
              <p className="creationHint">
                Your images stay in this browser until you choose Publish.
                Published copies are public after owner approval.
              </p>
              <button
                className="creationSecondary"
                onClick={() => selectSection("backgrounds")}
              >
                {photoMode
                  ? "Edit your main photo"
                  : "Want a full background? Open Backgrounds"}
              </button>
            </section>
          ) : section === "backgrounds" && photoMode ? (
            <section className="creationPanel" aria-label="Photo tools">
              <div className="panelTitle">
                <b>Your photo</b>
              </div>
              <p>
                Start with your own photo. Crop and color controls appear above
                the canvas.
              </p>
              <button
                className="creationPrimary"
                disabled={!ready || uploading}
                onClick={() => backgroundPhotoInput.current?.click()}
              >
                {baseBg.photo ? "Replace photo" : "Upload a photo"}
              </button>
              <p className="creationHint">JPG, PNG, or WebP · up to 15 MB.</p>
              <p className="creationHint">
                Add objects, text, and shapes with the tools above.
              </p>
            </section>
          ) : section === "backgrounds" ? (
            <>
              <div className="panelTitle">
                <b>Scene background</b>
                <small>
                  {filteredBackgrounds.length} / {backgrounds.length}{" "}
                  backgrounds
                </small>
              </div>
              <p className="backgroundIntro">
                Start simple with a sky, gradient, or open landscape. Add your
                own objects to build the image.
              </p>
              {!backgrounds.some(
                (bg) => sceneBackgroundKey(bg) === sceneBackgroundKey(baseBg),
              ) && (
                <p className="backgroundIntro">
                  Your saved background is preserved. Choose a scene to replace
                  it.
                </p>
              )}
              <button
                className="creationSecondary"
                disabled={!ready || uploading}
                onClick={() => backgroundPhotoInput.current?.click()}
              >
                {uploading ? "Opening image…" : "Use your photo as background"}
              </button>
              <button
                className="creationSecondary"
                onClick={() => selectSection("elements")}
              >
                Find elements for this scene
              </button>
              <label className="sceneMoodControl">
                Scene mood
                <select
                  aria-label="Scene mood"
                  value={state.present.mood ?? "Original"}
                  onChange={(event) =>
                    change((scene) => ({
                      ...scene,
                      mood: event.target.value as SceneMood,
                    }))
                  }
                >
                  {SCENE_MOODS.map((mood) => (
                    <option key={mood}>{mood}</option>
                  ))}
                </select>
              </label>
              <div className="backgroundFilters">
                <label className="srOnly" htmlFor="background-search">
                  Search backgrounds
                </label>
                <input
                  id="background-search"
                  type="search"
                  placeholder="Search backgrounds…"
                  value={backgroundSearch}
                  onChange={(e) => setBackgroundSearch(e.target.value)}
                />
                <label className="srOnly" htmlFor="background-category">
                  Background category
                </label>
                <select
                  id="background-category"
                  value={backgroundCategory}
                  onChange={(e) => setBackgroundCategory(e.target.value)}
                >
                  {[
                    "All",
                    "Skies",
                    "Gradients",
                    "Open landscapes",
                    "Colors",
                    "Full scenes",
                  ].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>
              {!filteredBackgrounds.length && (
                <p className="backgroundIntro">
                  No backgrounds match. Try another search or category.
                </p>
              )}
              <div className="visualBgGrid">
                {filteredBackgrounds.map((bg) => (
                  <button
                    key={backgroundKey(bg)}
                    title={bg.description || bg.name}
                    aria-pressed={
                      sceneBackgroundKey(baseBg) === sceneBackgroundKey(bg)
                    }
                    className={
                      sceneBackgroundKey(baseBg) === sceneBackgroundKey(bg)
                        ? "selected"
                        : ""
                    }
                    onClick={() => chooseBackground(bg)}
                  >
                    <span
                      style={{
                        aspectRatio: "3 / 2",
                        background: `linear-gradient(${bg.sky} 0 58%,${bg.ground} 58%)`,
                      }}
                    >
                      {bg.src ? (
                        <img src={bg.src} alt="" loading="lazy" />
                      ) : (
                        <i>⌁</i>
                      )}
                    </span>
                    <small>{bg.name}</small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="panelTitle">
                <b>
                  {section === "decorations" ? "Village details" : "Elements"}
                </b>
                <small>{sectionCats.length} groups</small>
              </div>
              <section
                className="matchingElements"
                aria-label="Matching scene elements"
              >
                <h3>
                  Matches your scene <small>{matching.name}</small>
                </h3>
                <p>Choose an object to add it to your artwork.</p>
                <div className="miniAssetGrid">
                  {matching.assets.map((asset) => (
                    <button
                      key={asset.id}
                      disabled={!ready}
                      aria-label={`Add matching ${pretty(asset.variant)}`}
                      onClick={() => addAsset(asset)}
                    >
                      <span>
                        <img src={asset.src} alt="" loading="lazy" />
                        <i>+</i>
                      </span>
                      <small>{pretty(asset.variant)}</small>
                    </button>
                  ))}
                </div>
              </section>
              <div className="categoryTiles">
                {sectionCats.map((c) => (
                  <button
                    key={c}
                    aria-pressed={pickerCat === c}
                    className={pickerCat === c ? "on" : ""}
                    onClick={() => setPickerCat(c)}
                  >
                    <span>{icon(c)}</span>
                    <small>{pretty(c)}</small>
                  </button>
                ))}
              </div>
              <input
                className="vSearch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search elements"
                placeholder="Search elements..."
              />
              <div className="assetCount">{filtered.length} elements</div>
              {!filtered.length && (
                <p className="noSelection">
                  No matching elements. Try another category or search.
                </p>
              )}
              <div className="miniAssetGrid">
                {filtered.map((a) => (
                  <button key={a.id} onClick={() => addAsset(a)}>
                    <span>
                      <img src={a.src} alt="" loading="lazy" />
                      <i>+</i>
                    </span>
                    <small>{pretty(a.variant || a.id)}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        <section className="vCenter">
          <div className="sceneHead">
            <span>{baseBg.name.toUpperCase()} • SCENE</span>
            <span>
              {items.length} elements{" "}
              <button onClick={clear}>♙ Clear All</button>
            </span>
          </div>
          <div className="sceneTools">
            <label>
              {photoMode ? "Crop ratio / canvas size" : "Canvas size"}
              <select
                aria-label="Canvas size"
                value={state.present.size ?? "landscape"}
                disabled={!ready}
                onChange={(e) => {
                  const size = e.target.value as CanvasSize;
                  change((scene) => ({ ...scene, size }));
                }}
              >
                {Object.entries(CANVAS_SIZES).map(([key, size]) => (
                  <option key={key} value={key}>
                    {size.label} · {size.width} × {size.height}
                  </option>
                ))}
              </select>
            </label>
            {baseBg.photo && (
              <div className="photoCompactControls">
                {" "}
                <button
                  className="editorIconButton"
                  aria-label={editingPhoto ? "Done cropping" : "Crop on photo"}
                  title={editingPhoto ? "Done cropping" : "Crop on photo"}
                  aria-pressed={editingPhoto}
                  onClick={() => {
                    setEditingPhoto(!editingPhoto);
                    setActive(null);
                  }}
                >
                  {<EditorIcon name={editingPhoto ? "done" : "crop"} />}
                </button>
                <details className="photoControlPanel">
                  <summary>Crop &amp; rotate options</summary>
                  <fieldset className="photoCropControls">
                    <legend>Photo crop</legend>
                    <p>
                      Zoom and move the photo inside the canvas. Your original
                      framing stays available.
                    </p>
                    {(["zoom", "x", "y"] as const).map((key) => (
                      <label key={key}>
                        {key === "zoom"
                          ? "Photo zoom"
                          : key === "x"
                            ? "Horizontal position"
                            : "Vertical position"}
                        <input
                          aria-label={
                            key === "zoom"
                              ? "Photo zoom"
                              : key === "x"
                                ? "Horizontal position"
                                : "Vertical position"
                          }
                          type="range"
                          min={key === "zoom" ? 1 : 0}
                          max={key === "zoom" ? 3 : 100}
                          step={key === "zoom" ? 0.01 : 1}
                          value={crop[key]}
                          onPointerDown={beginRange}
                          onChange={(e) =>
                            change((scene) => ({
                              ...scene,
                              baseBg: {
                                ...scene.baseBg,
                                crop: {
                                  ...photoCrop(scene.baseBg.crop),
                                  [key]: Number(e.target.value),
                                },
                              },
                            }))
                          }
                        />
                        <output>
                          {Math.round(
                            key === "zoom" ? crop[key] * 100 : crop[key],
                          )}
                          %
                        </output>
                      </label>
                    ))}
                    <div className="photoTransformActions">
                      <button
                        className="editorIconButton"
                        aria-label="Rotate left 90°"
                        title="Rotate left 90°"
                        onClick={() =>
                          change((scene) => ({
                            ...scene,
                            baseBg: {
                              ...scene.baseBg,
                              crop: {
                                ...photoCrop(scene.baseBg.crop),
                                rotation: (crop.rotation + 270) % 360,
                              },
                            },
                          }))
                        }
                      >
                        <EditorIcon name="left" />
                      </button>
                      <button
                        className="editorIconButton"
                        aria-label="Rotate right 90°"
                        title="Rotate right 90°"
                        onClick={() =>
                          change((scene) => ({
                            ...scene,
                            baseBg: {
                              ...scene.baseBg,
                              crop: {
                                ...photoCrop(scene.baseBg.crop),
                                rotation: (crop.rotation + 90) % 360,
                              },
                            },
                          }))
                        }
                      >
                        <EditorIcon name="right" />
                      </button>
                      <button
                        className="editorIconButton"
                        aria-label="Flip horizontally"
                        title="Flip horizontally"
                        aria-pressed={crop.flipX}
                        onClick={() =>
                          change((scene) => ({
                            ...scene,
                            baseBg: {
                              ...scene.baseBg,
                              crop: {
                                ...photoCrop(scene.baseBg.crop),
                                flipX: !crop.flipX,
                              },
                            },
                          }))
                        }
                      >
                        <EditorIcon name="flipX" />
                      </button>
                      <button
                        className="editorIconButton"
                        aria-label="Flip vertically"
                        title="Flip vertically"
                        aria-pressed={crop.flipY}
                        onClick={() =>
                          change((scene) => ({
                            ...scene,
                            baseBg: {
                              ...scene.baseBg,
                              crop: {
                                ...photoCrop(scene.baseBg.crop),
                                flipY: !crop.flipY,
                              },
                            },
                          }))
                        }
                      >
                        <EditorIcon name="flipY" />
                      </button>
                    </div>
                    <button
                      onClick={() =>
                        change((scene) => ({
                          ...scene,
                          baseBg: { ...scene.baseBg, crop: photoCrop() },
                        }))
                      }
                    >
                      Reset photo crop
                    </button>
                  </fieldset>
                </details>
              </div>
            )}
          </div>
          {photoMode && !baseBg.photo && (
            <section className="photoStart">
              <h2>Edit a photo</h2>
              <p>
                Choose a photo to start. Then crop it, adjust colors, and add
                text or scene elements.
              </p>
              <button
                className="primary"
                disabled={!ready || uploading}
                onClick={() => backgroundPhotoInput.current?.click()}
              >
                Choose a photo
              </button>
            </section>
          )}
          {photoMode && baseBg.photo && (
            <div className="photoQuickActions">
              <button
                className="editorIconButton"
                aria-label="Change photo"
                title="Change photo"
                disabled={uploading}
                onClick={() => backgroundPhotoInput.current?.click()}
              >
                <EditorIcon name="image" />
              </button>
              <button
                className="editorIconButton"
                aria-label="Add elements"
                title="Add elements"
                onClick={() => selectSection("elements")}
              >
                <EditorIcon name="elements" />
              </button>
              <button
                className="editorIconButton"
                aria-label="Add text"
                title="Add text"
                onClick={() => selectSection("text")}
              >
                <EditorIcon name="text" />
              </button>
            </div>
          )}
          {baseBg.photo && (
            <details className="photoControlPanel photoColorPanel">
              <summary>Adjust colors</summary>
              <fieldset className="photoCropControls photoAdjustments">
                <legend>Photo adjustments</legend>
                {(["brightness", "contrast", "saturation"] as const).map(
                  (key) => (
                    <label key={key}>
                      {key[0].toUpperCase() + key.slice(1)}
                      <input
                        aria-label={`Photo ${key}`}
                        type="range"
                        min="0"
                        max="2"
                        step="0.01"
                        value={adjustments[key]}
                        onPointerDown={beginRange}
                        onChange={(event) =>
                          change((scene) => ({
                            ...scene,
                            baseBg: {
                              ...scene.baseBg,
                              adjustments: photoAdjustments({
                                ...scene.baseBg.adjustments,
                                [key]: Number(event.target.value),
                              }),
                            },
                          }))
                        }
                      />
                      <output>{Math.round(adjustments[key] * 100)}%</output>
                    </label>
                  ),
                )}
                <button
                  onClick={() =>
                    change((scene) => ({
                      ...scene,
                      baseBg: {
                        ...scene.baseBg,
                        adjustments: photoAdjustments(),
                      },
                    }))
                  }
                >
                  Reset photo adjustments
                </button>
              </fieldset>
            </details>
          )}
          <CanvasViewport
            compact={photoMode}
            aspectRatio={WIDTH / HEIGHT}
            onNavigate={() => {
              pointerCleanup.current?.();
              dispatch({ type: "cancel" });
              setActive(null);
            }}
          >
            <div
              ref={board}
              aria-label="Scene canvas"
              className={`vBoard${baseBg.photo && editingPhoto ? " photoCropActive" : ""}`}
              onPointerDown={(event) => {
                setActive(null);
                if (!baseBg.photo || event.button !== 0) return;
                if (!editingPhoto) {
                  setEditingPhoto(true);
                  return;
                }
                const bounds = event.currentTarget.getBoundingClientRect();
                const startX = event.clientX,
                  startY = event.clientY;
                const sideways = crop.rotation % 180 !== 0;
                const overflowX =
                  (sideways ? photoRect.height : photoRect.width) - WIDTH;
                const overflowY =
                  (sideways ? photoRect.width : photoRect.height) - HEIGHT;
                beginPointer(event, (next) =>
                  change((scene) => ({
                    ...scene,
                    baseBg: {
                      ...scene.baseBg,
                      crop: {
                        ...crop,
                        x:
                          overflowX > 0.001
                            ? clamp(
                                crop.x -
                                  ((((next.clientX - startX) / bounds.width) *
                                    WIDTH) /
                                    overflowX) *
                                    100,
                                0,
                                100,
                              )
                            : crop.x,
                        y:
                          overflowY > 0.001
                            ? clamp(
                                crop.y -
                                  ((((next.clientY - startY) / bounds.height) *
                                    HEIGHT) /
                                    overflowY) *
                                    100,
                                0,
                                100,
                              )
                            : crop.y,
                      },
                    },
                  })),
                );
              }}
              style={{
                aspectRatio: `${WIDTH} / ${HEIGHT}`,
                background: `linear-gradient(${baseBg.sky} 0 45%,${baseBg.ground} 45%)`,
              }}
            >
              {baseBg.src && (
                <img
                  className="sceneBackground"
                  src={baseBg.src}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setPhotoDimensions({
                      src: img.src,
                      width: img.naturalWidth,
                      height: img.naturalHeight,
                    });
                  }}
                  style={
                    baseBg.photo
                      ? {
                          objectFit: "fill",
                          filter: photoFilter(baseBg.adjustments),
                          width: `${(photoRect.width / WIDTH) * 100}%`,
                          height: `${(photoRect.height / HEIGHT) * 100}%`,
                          left: `${(photoRect.x / WIDTH) * 100}%`,
                          top: `${(photoRect.y / HEIGHT) * 100}%`,
                          right: "auto",
                          bottom: "auto",
                          visibility:
                            photoDimensions.src === baseBg.src
                              ? "visible"
                              : "hidden",
                          transform: `rotate(${crop.rotation}deg) scale(${crop.flipX ? -1 : 1}, ${crop.flipY ? -1 : 1})`,
                        }
                      : {
                          objectFit:
                            state.present.size &&
                            state.present.size !== "landscape"
                              ? "cover"
                              : "fill",
                        }
                  }
                  alt=""
                  draggable={false}
                />
              )}
              {section === "draw" && (
                <svg
                  className="drawingSurface"
                  aria-label="Drawing canvas"
                  viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                  preserveAspectRatio="none"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const r = e.currentTarget.getBoundingClientRect();
                    const point: [number, number] = [
                      clamp(((e.clientX - r.left) / r.width) * WIDTH, 0, WIDTH),
                      clamp(
                        ((e.clientY - r.top) / r.height) * HEIGHT,
                        0,
                        HEIGHT,
                      ),
                    ];
                    drawStroke.current = { id: e.pointerId, points: [point] };
                    setDrawPoints([point]);
                  }}
                  onPointerLeave={() => setBrushCursor(null)}
                  onPointerMove={(e) => {
                    const bounds = e.currentTarget.getBoundingClientRect();
                    setBrushCursor([
                      ((e.clientX - bounds.left) / bounds.width) * WIDTH,
                      ((e.clientY - bounds.top) / bounds.height) * HEIGHT,
                    ]);
                    const stroke = drawStroke.current;
                    if (
                      !stroke ||
                      stroke.id !== e.pointerId ||
                      stroke.points.length >= 1000
                    )
                      return;
                    const r = e.currentTarget.getBoundingClientRect();
                    stroke.points.push([
                      clamp(((e.clientX - r.left) / r.width) * WIDTH, 0, WIDTH),
                      clamp(
                        ((e.clientY - r.top) / r.height) * HEIGHT,
                        0,
                        HEIGHT,
                      ),
                    ]);
                    setDrawPoints([...stroke.points]);
                  }}
                  onPointerCancel={() => {
                    drawStroke.current = null;
                    setDrawPoints([]);
                  }}
                  onPointerUp={(e) => {
                    const stroke = drawStroke.current;
                    if (!stroke || stroke.id !== e.pointerId) return;
                    drawStroke.current = null;
                    setDrawPoints([]);
                    if (["Flowers", "Grass", "Clouds"].includes(brushKind)) {
                      const candidates = assets.filter((asset) =>
                        brushKind === "Flowers"
                          ? asset.style === "freeimage" &&
                            asset.type === "flower"
                          : brushKind === "Grass"
                            ? /grass/.test(asset.variant) &&
                              !/potted/.test(asset.variant)
                            : asset.type === "sky" &&
                              /cloud/.test(asset.variant),
                      );
                      if (!candidates.length) return;
                      const points: [number, number][] = [];
                      for (const point of stroke.points) {
                        const last = points.at(-1);
                        if (
                          !last ||
                          Math.hypot(point[0] - last[0], point[1] - last[1]) >=
                            45
                        )
                          points.push(point);
                        if (points.length >= 50) break;
                      }
                      const stamps = points.map((point) => {
                        const asset = pick(candidates);
                        const scale = Math.max(
                          0.15,
                          (brushKind === "Clouds" ? 0.45 : 0.2) *
                            (brushSize / 8) *
                            (0.85 + Math.random() * 0.3),
                        );
                        return {
                          ...makeItem(asset),
                          x: ((point[0] - 160 * scale) / WIDTH) * 100,
                          y: ((point[1] - 135 * scale) / HEIGHT) * 100,
                          scale,
                          flipX: Math.random() > 0.5,
                        };
                      });
                      change((scene) => ({
                        ...scene,
                        items: [
                          ...scene.items,
                          ...stamps.map((item, index) => ({
                            ...item,
                            z:
                              Math.max(
                                0,
                                ...scene.items.map((entry) => entry.z),
                              ) +
                              index +
                              1,
                          })),
                        ],
                      }));
                      return;
                    }
                    const pad =
                      (brushKind === "Path" ? brushSize * 4 : brushSize) / 2 +
                      1;
                    const x = Math.min(...stroke.points.map((p) => p[0])) - pad,
                      y = Math.min(...stroke.points.map((p) => p[1])) - pad;
                    const w = Math.max(
                        32,
                        Math.max(...stroke.points.map((p) => p[0])) - x + pad,
                      ),
                      h = Math.max(
                        32,
                        Math.max(...stroke.points.map((p) => p[1])) - y + pad,
                      );
                    const factor = Math.max(1, w / 1200, h / 1200);
                    const asset = shapeAsset({
                      kind: "Drawing",
                      fill: "transparent",
                      stroke: brushKind === "Path" ? "#cbb58b" : brushColor,
                      strokeWidth:
                        (brushKind === "Path" ? brushSize * 4 : brushSize) /
                        factor,
                      width: w / factor,
                      height: h / factor,
                      points: stroke.points.map((p) => [
                        (p[0] - x) / factor,
                        (p[1] - y) / factor,
                      ]),
                    });
                    const item = {
                      ...makeItem(asset),
                      x: (x / WIDTH) * 100,
                      y: (y / HEIGHT) * 100,
                      scale: factor,
                    };
                    change((scene) => ({
                      ...scene,
                      items: [
                        ...scene.items,
                        {
                          ...item,
                          z: Math.max(0, ...scene.items.map((i) => i.z)) + 1,
                        },
                      ],
                    }));
                  }}
                >
                  {brushCursor &&
                    (stampBrush && brushAssets[0] ? (
                      <image
                        aria-label="Brush preview"
                        href={brushAssets[0].src}
                        x={brushCursor[0] - 160 * previewScale}
                        y={brushCursor[1] - 135 * previewScale}
                        width={320 * previewScale}
                        height={270 * previewScale}
                        opacity=".6"
                        pointerEvents="none"
                      />
                    ) : (
                      <circle
                        aria-label="Brush preview"
                        cx={brushCursor[0]}
                        cy={brushCursor[1]}
                        r={
                          (brushKind === "Path" ? brushSize * 4 : brushSize) / 2
                        }
                        fill={brushKind === "Path" ? "#cbb58b" : brushColor}
                        opacity=".5"
                        pointerEvents="none"
                      />
                    ))}
                  {drawPoints.length > 0 && !stampBrush && (
                    <path
                      d={
                        drawPoints
                          .map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`)
                          .join(" ") +
                        (drawPoints.length === 1 ? "l.01 .01" : "")
                      }
                      fill="none"
                      stroke={brushKind === "Path" ? "#cbb58b" : brushColor}
                      strokeWidth={
                        brushKind === "Path" ? brushSize * 4 : brushSize
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              )}
              {baseBg.photo && editingPhoto && (
                <div
                  className="photoCanvasCrop"
                  aria-label="Crop photo directly"
                >
                  <div className="photoCropGrid" />
                  <div
                    className="photoCanvasToolbar"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span>Drag photo to crop</span>
                    <button
                      aria-label="Zoom photo out"
                      onClick={() =>
                        change((scene) => ({
                          ...scene,
                          baseBg: {
                            ...scene.baseBg,
                            crop: {
                              ...crop,
                              zoom: clamp(crop.zoom - 0.1, 1, 3),
                            },
                          },
                        }))
                      }
                    >
                      −
                    </button>
                    <button
                      aria-label="Zoom photo in"
                      onClick={() =>
                        change((scene) => ({
                          ...scene,
                          baseBg: {
                            ...scene.baseBg,
                            crop: {
                              ...crop,
                              zoom: clamp(crop.zoom + 0.1, 1, 3),
                            },
                          },
                        }))
                      }
                    >
                      +
                    </button>
                    <button
                      aria-label="Rotate photo right"
                      onClick={() =>
                        change((scene) => ({
                          ...scene,
                          baseBg: {
                            ...scene.baseBg,
                            crop: {
                              ...crop,
                              rotation: (crop.rotation + 90) % 360,
                            },
                          },
                        }))
                      }
                    >
                      ↻
                    </button>
                    <button onClick={() => setEditingPhoto(false)}>Done</button>
                  </div>
                </div>
              )}
              {!photoMode && !welcomeDismissed && (
                <section
                  className="firstCreationGuide"
                  aria-label="Your first creation"
                >
                  <button
                    className="guideClose"
                    aria-label="Close getting started guide"
                    onClick={finishWelcome}
                  >
                    ×
                  </button>
                  <small>STEP {welcomeStep} OF 3</small>
                  {welcomeStep === 1 ? (
                    <>
                      <h2>Choose a scene to begin</h2>
                      <p>
                        Start with a ready-made landscape. Its trees and houses
                        will be editable.
                      </p>
                      <div className="guideSceneChoices">
                        {onboardingScenes.map((background) => (
                          <button
                            key={background.src}
                            onClick={() => chooseBackground(background)}
                          >
                            <img
                              src={
                                backgrounds.find(
                                  (entry) =>
                                    editableBackground(entry)?.src ===
                                    background.src,
                                )?.src
                              }
                              alt=""
                            />
                            <span>{background.name}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        className="guideTextButton"
                        onClick={() => selectSection("backgrounds")}
                      >
                        Browse all backgrounds
                      </button>
                    </>
                  ) : welcomeStep === 2 ? (
                    <>
                      <h2>Make it yours</h2>
                      <p>
                        Add a tree, flower, or animal. Matching suggestions
                        appear at the top of Elements.
                      </p>
                      <button
                        className="guidePrimary"
                        onClick={() => selectSection("elements")}
                      >
                        Choose an object
                      </button>
                      <button
                        className="guideTextButton"
                        onClick={() => selectSection("draw")}
                      >
                        Or draw something
                      </button>
                    </>
                  ) : (
                    <>
                      <h2>Your scene is taking shape</h2>
                      <p>
                        Keep arranging, or save your work and download the
                        finished picture.
                      </p>
                      <div className="guideFinishActions">
                        <button
                          className="guidePrimary"
                          onClick={() => void saveToCreations()}
                        >
                          Save creation
                        </button>
                        <button onClick={() => setDownloadDialogOpen(true)}>
                          Download image
                        </button>
                      </div>
                      <button
                        className="guideTextButton"
                        onClick={finishWelcome}
                      >
                        Keep creating
                      </button>
                    </>
                  )}
                </section>
              )}

              {[...items]
                .filter((item) => !item.hidden)
                .sort((a, b) => a.z - b.z)
                .map((it) => {
                  const selected = active === it.uid;
                  return (
                    <div
                      key={it.uid}
                      className={
                        "assetBox " +
                        (selected ? "selected " : "") +
                        (it.locked ? "locked" : "")
                      }
                      tabIndex={0}
                      aria-label={
                        pretty(it.asset.variant) + (it.locked ? ", locked" : "")
                      }
                      onFocus={() => setActive(it.uid)}
                      style={{
                        left: `${it.x}%`,
                        top: `${it.y}%`,
                        width: `${(itemDimensions(it).width / WIDTH) * 100}%`,
                        height: `${(itemDimensions(it).height / HEIGHT) * 100}%`,
                        zIndex: it.z,
                        transform: `rotate(${it.rotation}deg) scale(${it.flipX ? -1 : 1},${it.flipY ? -1 : 1})`,
                      }}
                      onPointerDown={(e) => down(e, it)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (it.asset.text && !it.locked)
                          setEditingText({
                            uid: it.uid,
                            content: it.asset.text.content,
                          });
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActive(it.uid);
                      }}
                    >
                      <img
                        src={it.asset.src}
                        alt={it.asset.variant || it.asset.id}
                        draggable={false}
                        style={{
                          visibility:
                            editingText?.uid === it.uid ? "hidden" : "visible",
                          opacity: it.opacity,
                          filter: `hue-rotate(${it.hue || 0}deg)`,
                        }}
                      />
                      {editingText?.uid === it.uid &&
                        it.asset.text &&
                        !it.locked && (
                          <textarea
                            className="canvasTextInput"
                            aria-label="Edit text on canvas"
                            autoFocus
                            rows={Math.max(
                              1,
                              Math.min(
                                8,
                                editingText.content
                                  .split("\n")
                                  .reduce(
                                    (n, line) =>
                                      n +
                                      Math.max(
                                        1,
                                        Math.ceil(Array.from(line).length / 20),
                                      ),
                                    0,
                                  ),
                              ),
                            )}
                            style={{
                              color: it.asset.text.color,
                              fontWeight: it.asset.text.bold ? 700 : 400,
                              fontFamily: textFontFamily(it.asset.text.font),
                              opacity: it.opacity,
                            }}
                            maxLength={240}
                            value={editingText.content}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              setEditingText({
                                uid: it.uid,
                                content: e.target.value,
                              })
                            }
                            onBlur={() => {
                              if (
                                editingText.content !== it.asset.text!.content
                              )
                                update(it.uid, {
                                  asset: textAsset({
                                    ...it.asset.text!,
                                    content: editingText.content,
                                  }),
                                });
                              setEditingText(null);
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingText(null);
                              }
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }}
                          />
                        )}
                      {selected && !it.locked && (
                        <>
                          <button
                            className="directDelete"
                            title="Delete"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(it.uid);
                            }}
                          >
                            ×
                          </button>
                          <span
                            className="resizeHandle nw"
                            onPointerDown={(e) => resizeDown(e, it, "nw")}
                          />
                          <span
                            className="resizeHandle ne"
                            onPointerDown={(e) => resizeDown(e, it, "ne")}
                          />
                          <span
                            className="resizeHandle sw"
                            onPointerDown={(e) => resizeDown(e, it, "sw")}
                          />
                          <span
                            className="resizeHandle se"
                            onPointerDown={(e) => resizeDown(e, it, "se")}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              {state.present.mood && state.present.mood !== "Original" && (
                <img
                  className="sceneMoodOverlay"
                  src={moodImage(state.present.mood, WIDTH, HEIGHT)}
                  alt=""
                />
              )}
              {current && !current.hidden && (
                <div
                  className="floatingTools"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {current.asset.text && !current.locked && (
                    <select
                      aria-label="Text font in toolbar"
                      value={current.asset.text.font ?? "sans"}
                      onChange={(e) =>
                        update(current.uid, {
                          asset: textAsset({
                            ...current.asset.text!,
                            font: e.target.value as TextFont,
                          }),
                        })
                      }
                    >
                      {Object.entries(TEXT_FONTS).map(([key, font]) => (
                        <option key={key} value={key}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {current.asset.text && !current.locked && (
                    <button
                      title="Edit text"
                      aria-label="Edit text"
                      onClick={() => {
                        setEditingPhoto(false);
                        setEditingText({
                          uid: current.uid,
                          content: current.asset.text!.content,
                        });
                      }}
                    >
                      <EditorIcon name="text" />
                    </button>
                  )}
                  <button
                    title="Duplicate"
                    aria-label="Duplicate"
                    onClick={() => duplicate(current)}
                  >
                    ▣ Duplicate
                  </button>
                  <button
                    disabled={current.locked}
                    title="Delete"
                    onClick={() => remove(current.uid)}
                  >
                    🗑
                  </button>
                  <button
                    disabled={current.locked}
                    title="Rotate left"
                    onClick={() => rotateDirect(current.uid, -15)}
                  >
                    ↶
                  </button>
                  <button
                    disabled={current.locked}
                    title="Rotate right"
                    onClick={() => rotateDirect(current.uid, 15)}
                  >
                    ↻
                  </button>
                  <button
                    disabled={current.locked}
                    title="Flip horizontal"
                    onClick={() =>
                      update(current.uid, { flipX: !current.flipX })
                    }
                  >
                    ↔
                  </button>
                  <button
                    disabled={current.locked}
                    title="Bring forward"
                    onClick={() => layer(current, "up")}
                  >
                    ↑
                  </button>
                  <button
                    title={current.locked ? "Unlock" : "Lock"}
                    onClick={() =>
                      update(current.uid, { locked: !current.locked })
                    }
                  >
                    {current.locked ? "🔓" : "🔒"}
                  </button>
                </div>
              )}
            </div>
          </CanvasViewport>
          <div className="addedStrip">
            <div className="stripTitle">
              <b>
                Scene elements (
                {items.filter((item) => item.backgroundScene).length}) · Your
                elements ({items.filter((item) => !item.backgroundScene).length}
                )
              </b>
            </div>
            <div className="stripItems">
              {items.map((it) => (
                <div key={it.uid} className="stripEntry">
                  <button
                    className={active === it.uid ? "on" : ""}
                    onClick={() => setActive(it.uid)}
                  >
                    <img src={it.asset.src} alt="" />
                    <small>
                      {pretty(it.asset.variant || it.asset.id)}
                      {it.backgroundScene ? " · Scene" : " · Yours"}
                      {it.locked ? " 🔒" : ""}
                    </small>
                  </button>
                  <button
                    className="stripRemove"
                    disabled={it.locked}
                    aria-label={`Remove ${pretty(it.asset.variant)}`}
                    onClick={() => remove(it.uid)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="addMore"
                onClick={() => selectSection("elements")}
              >
                <span>＋</span>
                <small>Add More</small>
              </button>
            </div>
          </div>
        </section>

        <aside className={`vRight mobilePanel-${mobilePanel}`}>
          <section className="layersPanel" aria-label="Layers">
            <div className="layersHeading">
              <h3>Layers</h3>
              <span>{items.length}</span>
            </div>
            <p className="layersHint">
              Front layers appear first. Drag to reorder, or use the arrows.
            </p>
            {!items.length && (
              <p className="layersHint">
                Add an object, shape, or text to start.
              </p>
            )}
            {current?.groupId && (
              <button
                className="creationSecondary"
                onClick={() =>
                  change((scene) => groupSelection(scene, [current.uid]))
                }
              >
                Ungroup objects
              </button>
            )}
            {selectedIds.length > 0 && (
              <div className="selectionTools">
                <p>
                  {
                    items.filter((item) => selectedIds.includes(item.uid))
                      .length
                  }{" "}
                  selected · Drag a selected object to move them together.
                </p>
                <button
                  disabled={selectedIds.length < 2}
                  onClick={() =>
                    change((scene) =>
                      groupSelection(scene, selectedIds, crypto.randomUUID()),
                    )
                  }
                >
                  Group selected
                </button>
                <button
                  onClick={() =>
                    change((scene) => groupSelection(scene, selectedIds))
                  }
                >
                  Ungroup selected
                </button>
                <button onClick={() => setSelectedIds([])}>
                  Clear selection
                </button>
                <button
                  onClick={() =>
                    change((scene) =>
                      duplicateSelection(scene, selectedIds, () =>
                        crypto.randomUUID(),
                      ),
                    )
                  }
                >
                  Duplicate selected
                </button>
                <button
                  onClick={() =>
                    change((scene) => ({
                      ...scene,
                      items: scene.items.filter(
                        (item) =>
                          !selectedIds.includes(item.uid) || item.locked,
                      ),
                    }))
                  }
                >
                  Delete selected
                </button>
                {["Front", "Back"].map((direction) => (
                  <button
                    key={direction}
                    onClick={() =>
                      change((scene) => {
                        const sorted = [...scene.items].sort(
                          (a, b) => a.z - b.z,
                        );
                        const chosen = sorted.filter(
                          (item) =>
                            selectedIds.includes(item.uid) && !item.locked,
                        );
                        const rest = sorted.filter(
                          (item) => !chosen.includes(item),
                        );
                        return {
                          ...scene,
                          items: (direction === "Front"
                            ? [...rest, ...chosen]
                            : [...chosen, ...rest]
                          ).map((item, index) => ({ ...item, z: index + 1 })),
                        };
                      })
                    }
                  >
                    Send selected to {direction.toLowerCase()}
                  </button>
                ))}
              </div>
            )}
            <ol className="layerList">
              {[...items]
                .sort((a, b) => b.z - a.z)
                .map((item, index) => {
                  const name = pretty(item.asset.variant || item.asset.id);
                  return (
                    <li
                      key={item.uid}
                      className={`layerRow ${active === item.uid ? "active" : ""} ${item.hidden ? "isHidden" : ""}`}
                      draggable={!item.locked}
                      onDragStart={(event) => {
                        draggedLayer.current = item.uid;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", item.uid);
                      }}
                      onDragEnd={() => {
                        draggedLayer.current = null;
                      }}
                      onDragOver={(event) => {
                        if (draggedLayer.current) {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const uid = draggedLayer.current;
                        draggedLayer.current = null;
                        if (uid)
                          change((scene) => moveLayer(scene, uid, item.uid));
                      }}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Include ${name} in selection`}
                        checked={selectedIds.includes(item.uid)}
                        onChange={(event) =>
                          setSelectedIds((ids) =>
                            event.target.checked
                              ? [...ids, item.uid]
                              : ids.filter((id) => id !== item.uid),
                          )
                        }
                      />
                      <button
                        className="layerSelect"
                        aria-label={`Select ${name} layer`}
                        aria-pressed={active === item.uid}
                        onClick={() => setActive(item.uid)}
                      >
                        <img src={item.asset.src} alt="" draggable={false} />
                        <span>
                          {name}
                          {item.groupId ? " · Group" : ""}
                        </span>
                      </button>
                      <div className="layerActions">
                        <button
                          aria-label={`${item.hidden ? "Show" : "Hide"} ${name} layer`}
                          title={item.hidden ? "Show layer" : "Hide layer"}
                          disabled={item.locked}
                          onClick={() =>
                            update(item.uid, { hidden: !item.hidden })
                          }
                        >
                          {item.hidden ? "Show" : "Hide"}
                        </button>
                        <button
                          aria-label={`${item.locked ? "Unlock" : "Lock"} ${name} layer`}
                          onClick={() =>
                            update(item.uid, { locked: !item.locked })
                          }
                        >
                          {item.locked ? "Unlock" : "Lock"}
                        </button>
                        <button
                          aria-label={`Move ${name} layer forward`}
                          disabled={item.locked || index === 0}
                          onClick={() => layer(item, "up")}
                        >
                          ↑
                        </button>
                        <button
                          aria-label={`Move ${name} layer backward`}
                          disabled={item.locked || index === items.length - 1}
                          onClick={() => layer(item, "down")}
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  );
                })}
            </ol>
          </section>
          <h3>Element Properties</h3>
          {!current ? (
            <div className="noSelection">
              Select an element on the scene to edit it.
            </div>
          ) : (
            <>
              <div className="selectedCard">
                <img src={current.asset.src} alt="" />
                <div>
                  <b>{pretty(current.asset.variant || current.asset.id)}</b>
                  <small>{pretty(catOf(current.asset))}</small>
                </div>
                <button
                  disabled={current.locked}
                  aria-label="Delete selected element"
                  onClick={() => remove(current.uid)}
                >
                  ♙
                </button>
              </div>
              <button
                className="propertyLock"
                onClick={() => duplicate(current)}
              >
                Duplicate element
              </button>
              <button
                className="propertyLock"
                onClick={() => update(current.uid, { locked: !current.locked })}
              >
                {current.locked ? "Unlock element" : "Lock element"}
              </button>
              {current.locked && (
                <p className="lockHint">
                  Unlock this element to edit or delete it.
                </p>
              )}
              <fieldset className="propertyFields" disabled={current.locked}>
                <legend className="srOnly">Element adjustments</legend>
                {current.asset.shape && (
                  <div className="textControls">
                    <div className="shapeDimensions">
                      {(["width", "height"] as const).map((axis) => (
                        <label key={axis}>
                          {axis === "width" ? "Width" : "Height"} (px)
                          <input
                            key={`${current.uid}-${itemDimensions(current)[axis]}`}
                            aria-label={`Shape ${axis}`}
                            type="number"
                            min={Math.ceil(32 * current.scale)}
                            max={Math.floor(1200 * current.scale)}
                            step="1"
                            defaultValue={Math.round(
                              itemDimensions(current)[axis],
                            )}
                            onKeyDown={(event) => {
                              if (event.key === "Enter")
                                event.currentTarget.blur();
                            }}
                            onBlur={(event) => {
                              const value = Number(event.target.value);
                              if (
                                !event.target.value.trim() ||
                                !Number.isFinite(value)
                              ) {
                                event.target.value = String(
                                  Math.round(itemDimensions(current)[axis]),
                                );
                                return;
                              }
                              const dimension = clamp(
                                value / current.scale,
                                32,
                                1200,
                              );
                              event.target.value = String(
                                Math.round(dimension * current.scale),
                              );
                              update(current.uid, {
                                asset: shapeAsset({
                                  ...current.asset.shape!,
                                  [axis]: dimension,
                                }),
                              });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    {current.asset.shape.kind !== "Line" && (
                      <>
                        <label>
                          Fill color
                          <input
                            aria-label="Shape fill"
                            type="color"
                            value={
                              current.asset.shape.fill === "transparent"
                                ? "#438568"
                                : current.asset.shape.fill
                            }
                            onChange={(e) =>
                              update(current.uid, {
                                asset: shapeAsset({
                                  ...current.asset.shape!,
                                  fill: e.target.value,
                                }),
                              })
                            }
                          />
                        </label>
                        <label className="shapeNoFill">
                          <input
                            type="checkbox"
                            checked={current.asset.shape.fill === "transparent"}
                            onChange={(e) =>
                              update(current.uid, {
                                asset: shapeAsset({
                                  ...current.asset.shape!,
                                  fill: e.target.checked
                                    ? "transparent"
                                    : "#438568",
                                  strokeWidth: e.target.checked
                                    ? Math.max(
                                        2,
                                        current.asset.shape!.strokeWidth,
                                      )
                                    : current.asset.shape!.strokeWidth,
                                }),
                              })
                            }
                          />{" "}
                          No fill
                        </label>
                      </>
                    )}
                    <label>
                      Outline color
                      <input
                        aria-label="Shape outline"
                        type="color"
                        value={current.asset.shape.stroke}
                        onChange={(e) =>
                          update(current.uid, {
                            asset: shapeAsset({
                              ...current.asset.shape!,
                              stroke: e.target.value,
                              strokeWidth: Math.max(
                                1,
                                current.asset.shape!.strokeWidth,
                              ),
                            }),
                          })
                        }
                      />
                    </label>
                    <Prop
                      label="Outline width"
                      value={`${current.asset.shape.strokeWidth} px`}
                    >
                      <input
                        aria-label="Outline width"
                        type="range"
                        min={current.asset.shape.kind === "Line" ? 1 : 0}
                        max="20"
                        step="1"
                        value={current.asset.shape.strokeWidth}
                        onPointerDown={beginRange}
                        onChange={(e) =>
                          update(current.uid, {
                            asset: shapeAsset({
                              ...current.asset.shape!,
                              strokeWidth: +e.target.value,
                            }),
                          })
                        }
                      />
                    </Prop>
                  </div>
                )}
                {current.asset.text && (
                  <div className="textControls">
                    <label>
                      Font
                      <select
                        aria-label="Text font"
                        value={current.asset.text.font ?? "sans"}
                        onChange={(e) =>
                          update(current.uid, {
                            asset: textAsset({
                              ...current.asset.text!,
                              font: e.target.value as TextFont,
                            }),
                          })
                        }
                      >
                        {Object.entries(TEXT_FONTS).map(([key, font]) => (
                          <option
                            key={key}
                            value={key}
                            style={{ fontFamily: font.family }}
                          >
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Text
                      <textarea
                        aria-label="Text content"
                        maxLength={240}
                        rows={4}
                        value={current.asset.text.content}
                        onChange={(e) =>
                          update(current.uid, {
                            asset: textAsset({
                              ...current.asset.text!,
                              content: e.target.value,
                            }),
                          })
                        }
                      />
                    </label>
                    <small>
                      Up to 8 lines; long lines wrap at 20 characters.
                    </small>
                    <label>
                      Text color
                      <input
                        aria-label="Text color"
                        type="color"
                        value={current.asset.text.color}
                        onChange={(e) =>
                          update(current.uid, {
                            asset: textAsset({
                              ...current.asset.text!,
                              color: e.target.value,
                            }),
                          })
                        }
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={current.asset.text.bold}
                        onChange={(e) =>
                          update(current.uid, {
                            asset: textAsset({
                              ...current.asset.text!,
                              bold: e.target.checked,
                            }),
                          })
                        }
                      />{" "}
                      Bold text
                    </label>
                  </div>
                )}
                <Prop
                  label="Size"
                  value={`${Math.round(current.scale * 100)}%`}
                >
                  <input
                    type="range"
                    onPointerDown={beginRange}
                    aria-label="Size"
                    min="15"
                    max="400"
                    step="1"
                    value={Math.round(current.scale * 100)}
                    onChange={(e) =>
                      update(current.uid, { scale: +e.target.value / 100 })
                    }
                  />
                  <div className="numberRow">
                    <label className="numberFieldWrap">
                      <span>Size</span>
                      <input
                        type="number"
                        min="15"
                        max="400"
                        step="1"
                        value={sizeInput}
                        onChange={(e) => setSizeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setNumericValue(
                              current.uid,
                              "scale",
                              Number(e.currentTarget.value) / 100,
                              0.15,
                              4,
                            );
                          }
                        }}
                        onBlur={(e) => {
                          const v = e.currentTarget.value.trim();
                          if (v === "") {
                            // restore previous value
                            setSizeInput(
                              String(Math.round(current.scale * 100)),
                            );
                            return;
                          }
                          setNumericValue(
                            current.uid,
                            "scale",
                            Number(v) / 100,
                            0.15,
                            4,
                          );
                        }}
                      />
                    </label>
                    <span className="numberSuffix">%</span>
                  </div>
                  <div className="quick">
                    {[50, 75, 100, 125, 150, 200].map((n) => (
                      <button
                        key={n}
                        onClick={() => update(current.uid, { scale: n / 100 })}
                      >
                        {n}%
                      </button>
                    ))}
                  </div>
                </Prop>
                <Prop label="Rotation" value={`${current.rotation}°`}>
                  <input
                    type="range"
                    onPointerDown={beginRange}
                    aria-label="Rotation"
                    min="-180"
                    max="180"
                    step="1"
                    value={current.rotation}
                    onChange={(e) =>
                      update(current.uid, { rotation: +e.target.value })
                    }
                  />
                  <div className="numberRow">
                    <label className="numberFieldWrap">
                      <span>Rotation</span>
                      <input
                        type="number"
                        min="-180"
                        max="180"
                        step="1"
                        value={rotationInput}
                        onChange={(e) => setRotationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setNumericValue(
                              current.uid,
                              "rotation",
                              Number(e.currentTarget.value),
                              -180,
                              180,
                            );
                          }
                        }}
                        onBlur={(e) => {
                          const v = e.currentTarget.value.trim();
                          if (v === "") {
                            setRotationInput(
                              String(Math.round(current.rotation)),
                            );
                            return;
                          }
                          setNumericValue(
                            current.uid,
                            "rotation",
                            Number(v),
                            -180,
                            180,
                          );
                        }}
                      />
                    </label>
                    <span className="numberSuffix">°</span>
                  </div>
                </Prop>
                <Prop label="Flip">
                  <div className="twoBtns">
                    <button
                      className={current.flipX ? "on" : ""}
                      onClick={() =>
                        update(current.uid, { flipX: !current.flipX })
                      }
                    >
                      ↔ Horizontal
                    </button>
                    <button
                      className={current.flipY ? "on" : ""}
                      onClick={() =>
                        update(current.uid, { flipY: !current.flipY })
                      }
                    >
                      ↕ Vertical
                    </button>
                  </div>
                </Prop>
                <Prop label="Layer">
                  <div className="layerGrid">
                    <button onClick={() => layer(current, "up")}>
                      ▱ Bring Forward
                    </button>
                    <button onClick={() => layer(current, "down")}>
                      ▱ Send Backward
                    </button>
                    <button onClick={() => layer(current, "front")}>
                      ▣ Bring to Front
                    </button>
                    <button onClick={() => layer(current, "back")}>
                      ▣ Send to Back
                    </button>
                  </div>
                </Prop>
                <Prop
                  label="Opacity"
                  value={`${Math.round(current.opacity * 100)}%`}
                >
                  <input
                    type="range"
                    onPointerDown={beginRange}
                    aria-label="Opacity"
                    min="10"
                    max="100"
                    value={Math.round(current.opacity * 100)}
                    onChange={(e) =>
                      update(current.uid, { opacity: +e.target.value / 100 })
                    }
                  />
                  <div className="numberRow">
                    <label className="numberFieldWrap">
                      <span>Opacity</span>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        step="1"
                        value={opacityInput}
                        onChange={(e) => setOpacityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setNumericValue(
                              current.uid,
                              "opacity",
                              Number(e.currentTarget.value) / 100,
                              0.1,
                              1,
                            );
                          }
                        }}
                        onBlur={(e) => {
                          const v = e.currentTarget.value.trim();
                          if (v === "") {
                            setOpacityInput(
                              String(Math.round(current.opacity * 100)),
                            );
                            return;
                          }
                          setNumericValue(
                            current.uid,
                            "opacity",
                            Number(v) / 100,
                            0.1,
                            1,
                          );
                        }}
                      />
                    </label>
                    <span className="numberSuffix">%</span>
                  </div>
                </Prop>
                <Prop label="Color" value={`${current.hue || 0}°`}>
                  <input
                    type="range"
                    onPointerDown={beginRange}
                    aria-label="Color"
                    min="0"
                    max="360"
                    step="1"
                    value={current.hue || 0}
                    onChange={(e) =>
                      update(current.uid, { hue: +e.target.value })
                    }
                  />
                  <div className="quick">
                    <button onClick={() => update(current.uid, { hue: 0 })}>
                      Original
                    </button>
                    <button onClick={() => update(current.uid, { hue: 45 })}>
                      Warm
                    </button>
                    <button onClick={() => update(current.uid, { hue: 120 })}>
                      Green
                    </button>
                    <button onClick={() => update(current.uid, { hue: 200 })}>
                      Blue
                    </button>
                    <button onClick={() => update(current.uid, { hue: 300 })}>
                      Pink
                    </button>
                  </div>
                </Prop>
              </fieldset>
            </>
          )}
        </aside>
      </div>
      {/* download popup menu is rendered adjacent to header button */}
      <footer className="vFoot">
        <span>Freelement Images</span>
        <span>Create • Arrange • Customize • Download</span>
        <span>Ctrl/⌘ Z: undo · S: save · Arrow keys: move</span>
      </footer>
    </main>
  );
}

function Prop({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="prop">
      <div className="propHead">
        <b>{label}</b>
        <span>{value}</span>
      </div>
      {children}
    </div>
  );
}
