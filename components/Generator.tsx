"use client";

import Link from "next/link";
import PublishDialog from "./PublishDialog";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import assets from "@/data/assets.json";
import { backgrounds, savedBackgrounds } from "@/lib/backgrounds";
import {
  WIDTH,
  HEIGHT,
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
import type { Asset, Background, Item, Scene } from "@/lib/scene";
import { renderScene } from "@/lib/export";

const aliases: Record<string, string> = {
  background: "backgrounds",
  tree: "trees",
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
const defaultScene: Scene = { baseBg: backgrounds[0], items: [] };
type Section = "backgrounds" | "elements" | "decorations" | "others";

export default function Generator({ sharedScene }: { sharedScene?: string }) {
  const [state, dispatch] = useReducer(
    sceneReducer,
    defaultScene,
    initialState,
  );
  const { baseBg, items } = state.present;
  const [active, setActive] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("backgrounds");
  const [pickerCat, setPickerCat] = useState(cats[0]);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState<
    "all" | "freeimage" | "original"
  >("all");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(serializeScene(defaultScene));
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publishScene, setPublishScene] = useState<Scene | null>(null);
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
  const current = items.find((item) => item.uid === active) || null;
  const [sizeInput, setSizeInput] = useState<string>("");
  const [rotationInput, setRotationInput] = useState<string>("");
  const [opacityInput, setOpacityInput] = useState<string>("");
  const filtered = useMemo(
    () =>
      (groups[pickerCat] || []).filter(
        (asset) =>
          (collection === "all" ||
            (collection === "freeimage"
              ? asset.style === "freeimage"
              : asset.style !== "freeimage")) &&
          pretty(asset.variant || asset.id)
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [groups, pickerCat, search, collection],
  );
  const dirty = serializeScene(state.present) !== saved;

  const change = (apply: (scene: Scene) => Scene) => {
    setNotice("");
    dispatch({ type: "change", apply });
  };

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
  const chooseBackground = (background: Background) =>
    change((scene) =>
      scene.baseBg === background ? scene : { ...scene, baseBg: background },
    );
  const clear = () => {
    change((scene) => (scene.items.length ? { ...scene, items: [] } : scene));
    setActive(null);
  };
  const newScene = () => {
    change(() => ({ ...defaultScene, items: [] }));
    setActive(null);
  };
  const positionFor = (category: string) => {
    let x = 36 + Math.random() * 20,
      y = 60,
      scale = 0.65;
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
    const item = makeItem(asset);
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
    if (key === "scale") setSizeInput(String(Math.round((clamped as number) * 100)));
    if (key === "rotation") setRotationInput(String(Math.round(clamped as number)));
    if (key === "opacity") setOpacityInput(String(Math.round((clamped as number) * 100)));
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
    const onMove = (next: PointerEvent) => {
      if (next.pointerId === pointerId) move(next);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", blur);
      pointerCleanup.current = null;
    };
    const finish = (next: PointerEvent) => {
      if (next.pointerId === pointerId) {
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
    event.stopPropagation();
    setActive(item.uid);
    if (item.locked || !board.current || event.button !== 0) return;
    const rect = board.current.getBoundingClientRect();
    const startX = event.clientX,
      startY = event.clientY;
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
    beginPointer(event, (next) =>
      update(
        item.uid,
        resizeItem(
          item,
          corner,
          ((next.clientX - startX) / rect.width) * WIDTH,
          ((next.clientY - startY) / rect.height) * HEIGHT,
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
      const pool = (groups[category] || []).filter(
        (asset) =>
          collection === "all" ||
          (collection === "freeimage"
            ? asset.style === "freeimage"
            : asset.style !== "freeimage"),
      );
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
    change(() => ({
      baseBg: pick(backgrounds.filter((bg) => bg.kind === "full")),
      items: out,
    }));
    setActive(null);
  };
  const save = () => {
    try {
      const value = serializeScene(state.present);
      localStorage.setItem(STORAGE_KEY, value);
      setSaved(value);
      setNotice("Saved in this browser.");
    } catch {
      setNotice(
        "Could not save. Browser storage may be full or unavailable. Your scene is still open.",
      );
    }
  };
  useEffect(() => {
    try {
      const raw = sharedScene || localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const scene = restoreScene(raw, assets, savedBackgrounds);
        dispatch({ type: "load", scene });
        setSaved(serializeScene(scene));
        setNotice(
          sharedScene
            ? "Editing a copy. Your saved scene stays unchanged until you save."
            : "Your saved scene is ready.",
        );
      }
    } catch {
      setNotice(
        "Your saved scene could not be loaded. You can still create a new scene.",
      );
    }
    setReady(true);
  }, [sharedScene]);
  const download = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setNotice("Preparing your PNG…");
    try {
      const blob = await renderScene(state.present);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "freelement-village.png";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("PNG downloaded (1200 × 800).");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "PNG export failed. Please try again.",
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
    setSection(next);
    setSearch("");
    if (next === "elements") setPickerCat("trees");
    if (next === "decorations") setPickerCat("garden-equipment");
    if (next === "others") setPickerCat("sky");
  };
  return (
    <main className="villageStudio">
      {publishScene && (
        <PublishDialog
          scene={publishScene}
          onClose={() => setPublishScene(null)}
        />
      )}
      <header className="vTop">
        <Link href="/" className="vBrand">
          <span className="leaf">◒</span>
          <div>
            <b>Freelement Images</b>
            <small>Build a village scene your way</small>
          </div>
        </Link>
        <div className="vActions">
          <button
            className="iconAction"
            disabled={!state.past.length}
            onClick={undo}
            title="Undo"
          >
            ↶
          </button>
          <button
            className="iconAction"
            disabled={!state.future.length}
            onClick={redo}
            title="Redo"
          >
            ↷
          </button>
          <button onClick={newScene}>⊕ New</button>
          <button onClick={randomScene}>⟳ Random</button>
          <button
            disabled={!ready}
            onClick={() => setPublishScene(state.present)}
          >
            Publish
          </button>
          <button disabled={!ready} onClick={save}>
            ▣ Save
          </button>
          <button
            className="download"
            disabled={exporting || !ready}
            onClick={download}
          >
            {exporting ? "Exporting…" : "⇩ Download PNG"}
          </button>
        </div>
      </header>
      <div className="sceneStatus">
        <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <span role="status" aria-live="polite">
          {notice}
        </span>
      </div>
      <div className="vWorkspace">
        <aside className="vLeft">
          <div className="bigTabs">
            <button
              aria-pressed={section === "backgrounds"}
              className={section === "backgrounds" ? "on" : ""}
              onClick={() => selectSection("backgrounds")}
            >
              ▣<span>Scenes</span>
            </button>
            <button
              aria-pressed={section === "elements"}
              className={section === "elements" ? "on" : ""}
              onClick={() => selectSection("elements")}
            >
              ◇<span>Objects</span>
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
          {section === "backgrounds" ? (
            <>
              <div className="panelTitle">
                <b>Scene background</b>
                <small>{backgrounds.length} scenes</small>
              </div>
              <p className="backgroundIntro">
                Distinct landscapes, ready to make your own.
              </p>
              {!backgrounds.some(
                (bg) => backgroundKey(bg) === backgroundKey(baseBg),
              ) && (
                <p className="backgroundIntro">
                  Your saved background is preserved. Choose a scene to replace
                  it.
                </p>
              )}
              <div className="visualBgGrid">
                {backgrounds.map((bg) => (
                  <button
                    key={backgroundKey(bg)}
                    title={bg.description || bg.name}
                    aria-pressed={backgroundKey(baseBg) === backgroundKey(bg)}
                    className={
                      backgroundKey(baseBg) === backgroundKey(bg)
                        ? "selected"
                        : ""
                    }
                    onClick={() => chooseBackground(bg)}
                  >
                    <span
                      style={{
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
              <label className="collectionFilter">
                Artwork collection
                <select
                  aria-label="Artwork collection"
                  value={collection}
                  onChange={(e) =>
                    setCollection(e.target.value as typeof collection)
                  }
                >
                  <option value="all">All artwork</option>
                  <option value="freeimage">Imported SVGs</option>
                  <option value="original">Original artwork</option>
                </select>
              </label>
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
                  No matching elements. Try another category, collection, or
                  search.
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
          <div
            ref={board}
            aria-label="Scene canvas"
            className="vBoard"
            onPointerDown={() => setActive(null)}
            style={{
              background: `linear-gradient(${baseBg.sky} 0 45%,${baseBg.ground} 45%)`,
            }}
          >
            {baseBg.src && (
              <img
                className="sceneBackground"
                src={baseBg.src}
                alt=""
                draggable={false}
              />
            )}
            {!items.length && (
              <div className="emptyScene">
                <b>Start your village</b>
                <span>
                  Choose a scene, then add trees, flowers, buildings and
                  details.
                </span>
                <button onClick={() => selectSection("elements")}>
                  Browse objects
                </button>
              </div>
            )}

            {[...items]
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
                      width: `${((ITEM_WIDTH * it.scale) / WIDTH) * 100}%`,
                      height: `${((ITEM_HEIGHT * it.scale) / HEIGHT) * 100}%`,
                      zIndex: it.z,
                      transform: `rotate(${it.rotation}deg) scale(${it.flipX ? -1 : 1},${it.flipY ? -1 : 1})`,
                    }}
                    onPointerDown={(e) => down(e, it)}
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
                        opacity: it.opacity,
                        filter: `hue-rotate(${it.hue || 0}deg)`,
                      }}
                    />
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
            {current && (
              <div
                className="floatingTools"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  disabled={current.locked}
                  title="Delete"
                  onClick={() => remove(current.uid)}
                >
                  🗑
                </button>
                <button title="Duplicate" onClick={() => duplicate(current)}>
                  ▣
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
                  onClick={() => update(current.uid, { flipX: !current.flipX })}
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
          <div className="addedStrip">
            <div className="stripTitle">
              <b>Added Elements ({items.length})</b>
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

        <aside className="vRight">
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
                              setSizeInput(String(Math.round(current.scale * 100)));
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
                            setRotationInput(String(Math.round(current.rotation)));
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
                            setOpacityInput(String(Math.round(current.opacity * 100)));
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
