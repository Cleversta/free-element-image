import { mkdir, readFile, writeFile } from "node:fs/promises";

const assets = JSON.parse(await readFile("data/assets.json", "utf8"));
const root = "public/assets/element-scenes";
await mkdir(root, { recursive: true });
// Inline existing vectors so downloads and server exports need no external images.
async function element(id, x, y, width, height, index) {
  const asset = assets.find((item) => item.id === id);
  if (!asset || !asset.src.startsWith("/assets/freeimage/"))
    throw new Error(`Missing Freeimage element: ${id}`);
  let svg = await readFile(`public${asset.src}`, "utf8");
  svg = svg
    .slice(
      svg.indexOf("<svg"),
      svg.search(/<\/svg\s*>\s*$/) + svg.match(/<\/svg\s*>\s*$/)[0].length,
    )
    .replace(/<metadata\b[\s\S]*?<\/metadata\s*>/g, "");
  const prefix = `element${index}-`;
  svg = svg
    .replace(/id="([^"]+)"/g, (_, value) => `id="${prefix}${value}"`)
    .replace(/url\(#([^)]+)\)/g, (_, value) => `url(#${prefix}${value})`)
    .replace(
      /(href=")#([^"]+)"/g,
      (_, attr, value) => `${attr}#${prefix}${value}"`,
    );
  return svg.replace(/<svg\b[^>]*>/, (tag) => {
    const viewBox = tag.match(/viewBox="([^"]+)"/);
    if (!viewBox) throw new Error(`Missing viewBox: ${id}`);
    const rootTag = tag.replace(/\s(?:x|y|width|height)="[^"]*"/g, "");
    return rootTag.replace(
      "<svg",
      `<svg x="${x}" y="${y}" width="${width}" height="${height}"`,
    );
  });
}
const path = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const scenes = [
  {
    name: "Apple Orchard Lane",
    sky: "#bcdff2",
    ground: "#86ac63",
    description:
      "Leafy trees flank a winding lane beside a small country cottage.",
    shapes: path(
      "M540 470 Q620 540 490 650 L340 800 H790 Q610 650 680 570 L640 470Z",
      "#dcca9c",
    ),
    objects: [
      ["freeimage-garden-house", 820, 345, 235, 205],
      ["freeimage-leafy-tree", 80, 290, 235, 310],
      ["freeimage-leafy-tree", 310, 370, 150, 220],
      ["freeimage-leafy-tree", 940, 475, 245, 315],
      ["freeimage-daisy", 30, 680, 190, 100],
    ],
  },
  {
    name: "Harvest Windmill Farm",
    sky: "#f5d4a0",
    ground: "#b5ad67",
    description:
      "Golden fields, farm silos, a red barn, and grazing farm animals.",
    shapes:
      path("M0 550 L1200 475 V800 H0Z", "#c9b66e") +
      path("M0 650 L1200 540 V570 L0 720Z", "#ead08b") +
      path("M0 770 L1200 625 V660 L0 800Z", "#9ca35c"),
    objects: [
      ["freeimage-farm-and-silos", 750, 385, 350, 170],
      ["freeimage-red-barn", 140, 365, 290, 240],
      ["freeimage-grazing-cow", 520, 565, 185, 140],
      ["freeimage-round-sheep", 760, 650, 130, 95],
    ],
  },
  {
    name: "Little Village Square",
    sky: "#c6e5eb",
    ground: "#91a879",
    description: "Village houses and a church surround a warm stone square.",
    shapes:
      '<ellipse cx="600" cy="670" rx="470" ry="190" fill="#d4c6af"/>' +
      path("M560 470 H630 L720 800 H450Z", "#d4c6af"),
    objects: [
      ["freeimage-purple-cottage", 105, 330, 290, 255],
      ["freeimage-blue-townhouse", 465, 305, 255, 235],
      ["freeimage-golden-church", 850, 290, 200, 285],
      ["freeimage-heart-leaf-tree", 10, 370, 170, 270],
      ["freeimage-white-hydrangea", 900, 670, 190, 110],
      ["freeimage-cream-cat", 410, 650, 110, 100],
    ],
  },
  {
    name: "Willow Woodland Pond",
    sky: "#c5dfd6",
    ground: "#729576",
    description: "A peaceful woodland pond ringed by leafy trees and ducks.",
    shapes:
      '<ellipse cx="610" cy="640" rx="425" ry="135" fill="#acc7a0"/><ellipse cx="610" cy="645" rx="375" ry="105" fill="#7bbac5"/><path d="M370 640 Q610 615 820 640 M430 690 Q610 670 720 686" stroke="#d2edf0" stroke-width="5" fill="none" opacity=".6"/>',
    objects: [
      ["freeimage-heart-leaf-tree", 15, 260, 265, 380],
      ["freeimage-leafy-tree", 930, 255, 260, 365],
      ["freeimage-young-cedar-tree", 770, 300, 140, 230],
      ["freeimage-mallard-duck", 490, 600, 90, 70],
      ["freeimage-mallard-duck", 660, 655, 70, 55],
      ["freeimage-purple-sweetvetch", 90, 680, 210, 100],
    ],
  },
  {
    name: "Highland Cabin Trail",
    sky: "#b8d1e3",
    ground: "#7b9270",
    description:
      "A timber cabin below jagged alpine peaks with a cedar-lined trail.",
    shapes:
      path(
        "M0 470 L230 145 L400 350 L620 85 L910 410 L1070 200 L1200 470Z",
        "#7e96a3",
      ) +
      path(
        "M151 255 L230 145 L310 255 L256 237 L224 273 L205 239Z M530 212 L620 85 L725 223 L651 187 L613 229 L581 186Z",
        "#edf2eb",
      ) +
      path("M645 495 Q720 590 620 800 H900 Q780 620 720 495Z", "#cabb9b"),
    objects: [
      ["freeimage-brown-village-house", 700, 350, 270, 220],
      ["freeimage-young-cedar-tree", 45, 300, 240, 380],
      ["freeimage-young-cedar-tree", 260, 390, 150, 240],
      ["freeimage-young-cedar-tree", 965, 390, 220, 360],
    ],
  },
  {
    name: "Seaside Cottage Meadow",
    sky: "#b8e3ef",
    ground: "#a4b886",
    description:
      "A coastal cottage overlooks open blue water and a flower-covered bluff.",
    shapes:
      path("M0 415 H1200 V800 H0Z", "#79bdcd") +
      path("M0 540 Q360 410 660 580 Q800 720 1200 710 V800 H0Z", "#a4b886") +
      '<path d="M40 465 H420 M720 480 H1150 M760 555 H1090" stroke="#e0f4ed" stroke-width="4" opacity=".6"/>',
    objects: [
      ["freeimage-garden-house", 110, 365, 260, 220],
      ["freeimage-heart-leaf-tree", 15, 315, 165, 270],
      ["freeimage-poppy", 370, 665, 160, 100],
      ["freeimage-daisy", 930, 715, 200, 80],
    ],
  },
  {
    name: "Moonlit Pine Camp",
    sky: "#233857",
    ground: "#465d57",
    description:
      "A starry cedar clearing with a tiny cabin and a glowing moon.",
    shapes:
      '<circle cx="880" cy="145" r="52" fill="#f5e9ba"/>' +
      Array.from(
        { length: 32 },
        (_, i) =>
          `<circle cx="${(i * 137 + 53) % 1200}" cy="${(i * 67 + 25) % 340}" r="${(i % 3) + 1}" fill="#fff3d4" opacity=".7"/>`,
      ).join("") +
      '<ellipse cx="625" cy="690" rx="240" ry="100" fill="#7e806b"/>',
    objects: [
      ["freeimage-young-cedar-tree", 20, 280, 255, 440],
      ["freeimage-young-cedar-tree", 255, 365, 165, 300],
      ["freeimage-brown-village-house", 490, 405, 230, 205],
      ["freeimage-young-cedar-tree", 900, 310, 265, 455],
    ],
  },
  {
    name: "Cottage Flower Garden",
    sky: "#e2d5ed",
    ground: "#9fb57a",
    description:
      "A cozy cottage garden with colorful flower beds and a leafy tree.",
    shapes:
      path("M580 505 Q520 630 640 800 H820 Q650 625 655 505Z", "#e1c9ac") +
      '<ellipse cx="265" cy="710" rx="235" ry="65" fill="#758a59"/><ellipse cx="995" cy="710" rx="205" ry="65" fill="#758a59"/>',
    objects: [
      ["freeimage-purple-cottage", 470, 300, 320, 275],
      ["freeimage-heart-leaf-tree", 30, 240, 265, 370],
      ["freeimage-white-hydrangea", 60, 600, 190, 155],
      ["freeimage-poppy", 260, 645, 175, 120],
      ["freeimage-daisy", 820, 645, 170, 125],
      ["freeimage-purple-sweetvetch", 1000, 610, 185, 145],
    ],
  },
];
scenes.push(
  {
    ...scenes[2],
    name: "Cozy Village Green",
    sky: "#f0dfa7",
    ground: "#a8b77b",
    description: "A welcoming village green with cottages and a church.",
    objects: scenes[2].objects.map((item) => [...item]),
  },
  {
    ...scenes[5],
    name: "Tropical Beach Garden",
    sky: "#a4e5f5",
    ground: "#a8bd7b",
    description: "A palm-framed seaside garden beside bright tropical water.",
    objects: scenes[5].objects.map((item) =>
      item[0] === "freeimage-heart-leaf-tree"
        ? ["freeimage-tropical-palm", 15, 235, 240, 360]
        : [...item],
    ),
  },
  {
    ...scenes[2],
    name: "Rainy Village Street",
    sky: "#a8b8c8",
    ground: "#82978a",
    description: "A soft gray village with rain clouds and a quiet square.",
    objects: [
      ...scenes[2].objects,
      ["freeimage-rain-cloud", 130, 70, 360, 180],
      ["freeimage-soft-gray-cloud", 740, 95, 340, 160],
    ],
  },
  {
    ...scenes[7],
    name: "Enchanted Treehouse Garden",
    sky: "#c8b6e7",
    ground: "#83af95",
    description:
      "A whimsical treehouse among colorful flowers and heart-shaped leaves.",
    objects: scenes[7].objects.map((item) =>
      item[0] === "freeimage-purple-cottage"
        ? ["freeimage-treehouse", 440, 160, 340, 430]
        : [...item],
    ),
  },
);
const records = [];
const templates = [];
for (const scene of scenes) {
  // Soft ground shadows anchor objects; sparse grass gives the open foreground depth.
  const shadows = scene.objects
    .filter(([id]) => !/cloud/.test(id))
    .map(
      ([, x, y, w, h]) =>
        `<ellipse cx="${x + w / 2}" cy="${y + h * 0.91}" rx="${w * 0.3}" ry="${Math.max(4, h * 0.035)}" fill="#20392e" opacity=".10"/>`,
    )
    .join("");
  const texture = Array.from({ length: 30 }, (_, i) => {
    const x = (i * 173 + 29) % 1200,
      y = 710 + ((i * 31) % 85);
    return `<path d="M${x} ${y} l-3 -8 m3 8 l4 -11" stroke="#496d48" stroke-width="1.5" opacity=".15" fill="none"/>`;
  }).join("");
  const slug = scene.name.toLowerCase().replaceAll(" ", "-");
  const objects = await Promise.all(
    scene.objects.map((args, index) => element(...args, index)),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${scene.sky}"/><stop offset="1" stop-color="${scene.ground}"/></linearGradient></defs><rect width="1200" height="800" fill="url(#sky)"/>${path("M0 500 Q260 410 540 490 T1200 470 V800 H0Z", scene.ground)}${scene.shapes}${texture}${shadows}${objects.join("")}</svg>\n`;
  await writeFile(`${root}/${slug}.svg`, svg);
  const baseSrc = `/assets/element-scenes/${slug}-base.svg`;
  await writeFile(
    `public${baseSrc}`,
    svg.replace(objects.join(""), "").replace(shadows, ""),
  );
  const editableItems = await Promise.all(
    scene.objects.map(async ([id, x, y, width, height]) => {
      const asset = assets.find((item) => item.id === id);
      const source = await readFile(`public${asset.src}`, "utf8");
      const box = source
        .match(/viewBox="([^"]+)"/)[1]
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      const scale =
        Math.min(width / box[2], height / box[3]) /
        Math.min(320 / box[2], 270 / box[3]);
      return {
        assetId: id,
        x: (x + (width - 320 * scale) / 2) / 12,
        y: (y + (height - 270 * scale) / 2) / 8,
        scale,
      };
    }),
  );
  templates.push({
    src: `/assets/element-scenes/${slug}.svg`,
    background: {
      name: scene.name,
      description: scene.description,
      sky: scene.sky,
      ground: scene.ground,
      src: baseSrc,
      kind: "full",
    },
    items: editableItems,
  });
  records.push({
    name: scene.name,
    description: scene.description,
    sky: scene.sky,
    ground: scene.ground,
    src: `/assets/element-scenes/${slug}.svg`,
    kind: "full",
  });
}
await writeFile(
  "data/element-scenes.json",
  JSON.stringify(records, null, 2) + "\n",
);
console.log(`Created ${records.length} scenes from existing elements.`);

await writeFile(
  "data/editable-element-scenes.json",
  JSON.stringify(templates, null, 2) + "\n",
);
