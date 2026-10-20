export const SCENE_MOODS = [
  "Original",
  "Morning",
  "Sunset",
  "Night",
  "Misty",
] as const;
export type SceneMood = (typeof SCENE_MOODS)[number];
export function moodSvg(
  mood: SceneMood | undefined,
  width: number,
  height: number,
) {
  const colors = {
    Morning: ["#ffe6a0", 0.12],
    Sunset: ["#ef875c", 0.24],
    Night: ["#142749", 0.56],
    Misty: ["#eef4ee", 0.32],
  } as const;
  if (!mood || mood === "Original") return "";
  const [color, opacity] = colors[mood];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${color}" opacity="${opacity}"/></svg>`;
}
export function moodImage(
  mood: SceneMood | undefined,
  width: number,
  height: number,
) {
  const svg = moodSvg(mood, width, height);
  return svg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    : "";
}
