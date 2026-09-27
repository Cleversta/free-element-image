import { mkdir, writeFile } from "node:fs/promises";
const root = "public/assets/simple-backgrounds";
await mkdir(root, { recursive: true });
const palettes = [
  ["Morning", "#b8ddf3", "#f4f6de", "#9bbd8a", "#6d9b72"],
  ["Golden", "#f2c97e", "#fff0cc", "#d6b878", "#a8915d"],
  ["Rose", "#d5b8e6", "#ffd6ce", "#c5a5b4", "#a383a1"],
  ["Mint", "#b7ded8", "#eff7df", "#a4c9ae", "#6b9e8d"],
  ["Blue", "#83add7", "#d9e9f1", "#8daec6", "#6689ad"],
  ["Twilight", "#25375e", "#9b83a9", "#626a91", "#3d496d"],
];
const groups = [
  ["gradient", "Soft gradient", "Gradients"],
  ["glow", "Gentle glow", "Gradients"],
  ["clouds", "Open sky", "Skies"],
  ["horizon", "Quiet horizon", "Skies"],
  ["hills", "Rolling hills", "Open landscapes"],
  ["dunes", "Smooth dunes", "Open landscapes"],
];
const records = [];
for (const [kind, title, category] of groups)
  for (const [tone, top, bottom, far, near] of palettes) {
    const name = `${tone} ${title.toLowerCase()}`;
    const slug = `${tone.toLowerCase()}-${kind}`;
    let shapes = "";
    if (kind === "glow")
      shapes =
        '<ellipse cx="600" cy="340" rx="610" ry="490" fill="url(#glow)"/>';
    if (kind === "clouds")
      shapes =
        '<g fill="#ffffff" opacity=".32"><path d="M-80 160 Q30 100 125 146 Q180 62 275 130 Q370 105 415 173 Q230 210 -80 195Z"/><path d="M840 228 Q940 150 1030 203 Q1110 117 1210 190 L1290 250 Q1040 275 840 250Z"/></g>';
    if (kind === "horizon")
      shapes = `<ellipse cx="600" cy="480" rx="105" ry="105" fill="${bottom}" opacity=".65"/><path d="M0 570 Q600 535 1200 570 V800 H0Z" fill="${far}" opacity=".45"/><path d="M0 650 Q600 620 1200 650" stroke="${bottom}" opacity=".35" fill="none" stroke-width="3"/>`;
    if (kind === "hills")
      shapes = `<path d="M0 550 Q210 340 480 535 T1200 485 V800 H0Z" fill="${far}"/><path d="M0 680 Q310 465 630 635 T1200 600 V800 H0Z" fill="${near}"/>`;
    if (kind === "dunes")
      shapes = `<path d="M0 615 Q450 320 1200 565 V800 H0Z" fill="${far}"/><path d="M0 660 Q770 440 1200 685 V800 H0Z" fill="${near}"/><path d="M0 660 Q770 440 1200 685" fill="none" stroke="${bottom}" opacity=".4" stroke-width="3"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><radialGradient id="glow"><stop stop-color="${bottom}" stop-opacity=".95"/><stop offset="1" stop-color="${bottom}" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="800" fill="url(#sky)"/>${shapes}</svg>`;
    await writeFile(`${root}/${slug}.svg`, svg + "\n");
    records.push({
      name,
      description: `${title} in ${tone.toLowerCase()} tones, with open space for your objects and text.`,
      sky: top,
      ground: bottom,
      src: `/assets/simple-backgrounds/${slug}.svg`,
      kind: "landscape",
      category,
    });
  }
await writeFile(
  "data/simple-backgrounds.json",
  JSON.stringify(records, null, 2) + "\n",
);
console.log(`Created ${records.length} simple backgrounds.`);
