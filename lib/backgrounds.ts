import assets from "../data/assets.json" with { type: "json" };
import type { Background } from "./scene.ts";
import { backgroundKey } from "./scene.ts";
import craftedScenes from "../data/scene-backgrounds.json" with { type: "json" };
import elementScenes from "../data/element-scenes.json" with { type: "json" };
import editableElementScenes from "../data/editable-element-scenes.json" with { type: "json" };

import simpleBackgrounds from "../data/simple-backgrounds.json" with { type: "json" };

const BASE_BACKGROUNDS = [
  ["Meadow", "#bfe0ef", "#9fbd79"],
  ["Village", "#c5e1eb", "#8faa70"],
  ["Mountains", "#b9d8e6", "#7e9476"],
  ["Forest", "#b7d2cf", "#536f55"],
  ["Lake", "#b5ddeb", "#79b7c9"],
  ["Countryside", "#c8e2ea", "#a6b66f"],
  ["Farm", "#c3dfe8", "#b5a665"],
  ["Beach", "#9ed9ee", "#dfc58c"],
  ["Sunset", "#dc9182", "#7a674e"],
  ["Autumn", "#cad5d5", "#a27a50"],
  ["Winter", "#c4d8e1", "#e4ecee"],
  ["Night", "#2b405d", "#344c42"],
  ["River Valley", "#b8dde9", "#78a175"],
  ["Flower Field", "#c4e1ea", "#91b777"],
  ["Country Road", "#c5e0e8", "#9bad78"],
  ["Desert", "#b6dbe7", "#d2a66f"],
  ["Snow Peaks", "#b8d0df", "#d8e3e6"],
  ["Spring", "#c4e4ec", "#9ac17c"],
  ["Cloudy", "#bac6ca", "#81916f"],
  ["Storm", "#72838d", "#506252"],
  ["Misty Hills", "#c9d2d3", "#939e90"],
  ["Moonlight", "#263a55", "#30473e"],
  ["Prairie", "#c2dfe7", "#b5b16e"],
  ["Marsh", "#bdd5d9", "#758e71"],
].map(([name, sky, ground]) => ({ name, sky, ground }));

const MERGED_BASE_BACKGROUNDS = [
  { name: "Distant Forest", sky: "#bfdbe3", ground: "#667f5e" },
  { name: "Village Silhouette", sky: "#c8dce2", ground: "#7e8e68" },
  { name: "Cliffs", sky: "#b9d7e2", ground: "#8c806d" },
  { name: "Low Hills", sky: "#c5e0e8", ground: "#91ad73" },
  { name: "Mountain Valley", sky: "#b5d5e4", ground: "#78936b" },
  { name: "Open Countryside", sky: "#c8e3eb", ground: "#a6bd7c" },
  { name: "Distant City", sky: "#c0d7df", ground: "#7c8876" },
  { name: "Forest Edge", sky: "#bad7d6", ground: "#557158" },
];

const legacyBackgrounds: Background[] = [
  ...assets
    .filter(
      (a) =>
        a.type === "background" &&
        a.style !== "crafted-landscapes" &&
        a.src.includes("/full/"),
    )
    .map((a) => ({
      name: a.variant
        .replace(/-full$/, "")
        .replaceAll("-", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      sky: "#bfe0ef",
      ground: "#9fbd79",
      src: a.src,
      kind: "full" as const,
    })),
  ...BASE_BACKGROUNDS.map((bg) => ({ ...bg, name: bg.name + " Colors" })),
  ...MERGED_BASE_BACKGROUNDS.map((bg) => ({
    ...bg,
    name: bg.name + " Colors",
  })),
  ...assets
    .filter(
      (a) =>
        a.type === "background" &&
        a.style !== "crafted-landscapes" &&
        !a.src.includes("/full/"),
    )
    .map((a) => ({
      name:
        a.variant
          .replaceAll("-", " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()) + " Landscape",
      sky: "#bfe0ef",
      ground: "#9fbd79",
      src: a.src,
      kind: "landscape" as const,
    })),
];

// Keep the picker focused; retired artwork remains resolvable for saved scenes.
const retainedNames = new Set([
  "Meadow Day",
  "Lake Sunset",
  "Meadow Colors",
  "Winter Colors",
  "Night Colors",
  "Desert Colors",
]);
export const backgrounds: Background[] = [
  ...simpleBackgrounds.map((scene) => ({
    ...scene,
    kind: "landscape" as const,
  })),
  ...[...craftedScenes, ...elementScenes].map((scene) => ({
    ...scene,
    kind: "full" as const,
    category: "Full scenes",
  })),
  ...legacyBackgrounds
    .filter((scene) => retainedNames.has(scene.name))
    .map((scene) => ({
      ...scene,
      category: scene.src ? "Full scenes" : "Colors",
    })),
];
const visibleKeys = new Set(backgrounds.map(backgroundKey));
export const photoCanvasBackground: Background = {
  name: "Photo canvas",
  sky: "#ffffff",
  ground: "#ffffff",
};
export const savedBackgrounds: Background[] = [
  photoCanvasBackground,
  ...backgrounds,
  ...editableElementScenes.map(({ background }) => ({
    ...background,
    kind: "full" as const,
  })),
  ...legacyBackgrounds.filter(
    (scene) => !visibleKeys.has(backgroundKey(scene)),
  ),
];
