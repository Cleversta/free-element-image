// Deterministic SVG silhouettes; editable like all other shapes.
const variants = [
  ["Cloud blob", 5, 0.18, 1, 136, 100],
  ["Pebble blob", 2, 0.12, 2, 124, 110],
  ["Wavy blob", 6, 0.2, 3, 126, 104],
  ["Tall blob", 3, 0.19, 4, 87, 115],
  ["Wide blob", 3, 0.16, 5, 142, 73],
  ["Flat blob", 4, 0.14, 6, 143, 38],
  ["Flower blob", 6, 0.25, 7, 112, 107],
  ["Splash blob", 7, 0.29, 8, 112, 102],
  ["Soft square blob", 4, 0.11, 9, 131, 107],
  ["Soft triangle blob", 3, 0.24, 10, 120, 108],
  ["Bubble blob", 2, 0.24, 11, 120, 105],
  ["Bean blob", 1, 0.27, 12, 118, 101],
  ["Jelly blob", 5, 0.14, 13, 125, 102],
  ["Ribbon blob", 3, 0.28, 14, 143, 62],
  ["Petal blob", 3, 0.15, 15, 108, 115],
  ["Puddle blob", 5, 0.22, 16, 135, 83],
  ["Coral blob", 8, 0.24, 17, 117, 103],
  ["Rounded blob", 2, 0.07, 18, 121, 114],
  ["Twisted blob", 4, 0.25, 19, 116, 104],
  ["Playful blob", 5, 0.3, 20, 118, 101],
] as const;
export type BlobName = (typeof variants)[number][0];
export const BLOB_NAMES = variants.map((v) => v[0]);
export const BLOB_COLORS = [
  "#f5aec2",
  "#d4b0df",
  "#a5c0ee",
  "#bfdcbc",
  "#f5cedd",
  "#d5a186",
  "#a2e4df",
  "#ffd5ad",
  "#f6efb5",
  "#ff95a5",
];
function silhouette(
  lobes: number,
  amplitude: number,
  seed: number,
  rx: number,
  ry: number,
) {
  const points = Array.from({ length: 48 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 48;
    const radius =
      (1 +
        amplitude * Math.sin(lobes * angle + seed * 0.7) +
        0.065 * Math.cos((lobes + 1) * angle + seed)) /
      (1 + amplitude + 0.065);
    return {
      x: 160 + Math.cos(angle) * rx * radius,
      y: 135 + Math.sin(angle) * ry * radius,
    };
  });
  const p = (i: number) => points[(i + points.length) % points.length];
  const fmt = (x: number) => x.toFixed(2);
  let path = `M${fmt(p(0).x)} ${fmt(p(0).y)}`;
  for (let i = 0; i < points.length; i++) {
    const a = p(i - 1),
      b = p(i),
      c = p(i + 1),
      d = p(i + 2);
    path += `C${fmt(b.x + (c.x - a.x) / 6)} ${fmt(b.y + (c.y - a.y) / 6)} ${fmt(c.x - (d.x - b.x) / 6)} ${fmt(c.y - (d.y - b.y) / 6)} ${fmt(c.x)} ${fmt(c.y)}`;
  }
  return `<path d="${path}Z"/>`;
}
export const BLOB_PATHS = Object.fromEntries(
  variants.map(([name, lobes, amplitude, seed, rx, ry]) => [
    name,
    silhouette(lobes, amplitude, seed, rx, ry),
  ]),
) as Record<BlobName, string>;
