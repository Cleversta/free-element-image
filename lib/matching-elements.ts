import assets from "../data/assets.json" with { type: "json" };
import templates from "../data/editable-element-scenes.json" with { type: "json" };
import type { Background } from "./scene.ts";

const themes = [
  {
    name: "Coastal",
    pattern: /coast|beach|sea|cove|tropical/,
    variants: /palm|bird|pavilion|garden-house|boat|sand|shell/,
  },
  {
    name: "Woodland",
    pattern: /forest|wood|birch|jungle|pond|falls/,
    variants: /tree|cedar|duck|rabbit|bird|sweetvetch|fern/,
  },
  {
    name: "Mountain",
    pattern: /mountain|alpine|highland|snow|winter|pine|moon|night|northern/,
    variants: /cedar|dark-roof-house|brown-village-house|rabbit|bird|rock/,
  },
  {
    name: "Garden",
    pattern: /flower|garden|lavender|blossom|spring/,
    variants:
      /flower|rose|tulip|daisy|poppy|hydrangea|butterfly|purple-cottage|heart-leaf/,
  },
  {
    name: "Village",
    pattern: /village|farm|harvest|orchard|country|terrace|vineyard/,
    variants: /house|barn|farm|goat|cow|sheep|chicken|leafy-tree|sunflower/,
  },
];
export function matchingElements(background: Background) {
  const template = templates.find(
    (entry) =>
      entry.src === background.src || entry.background.src === background.src,
  );
  const theme = themes.find((entry) =>
    entry.pattern.test(background.name.toLowerCase()),
  );
  const included = new Set(template?.items.map((item) => item.assetId) ?? []);
  const matches = assets.filter(
    (asset) =>
      asset.style === "freeimage" &&
      (included.has(asset.id) ||
        (theme?.variants.test(asset.variant) ??
          /tree|house|flower/.test(asset.variant))),
  );
  return {
    name: theme?.name ?? "Landscape",
    assets: [
      ...matches.filter((asset) => included.has(asset.id)),
      ...matches.filter((asset) => !included.has(asset.id)),
    ].slice(0, 16),
  };
}
