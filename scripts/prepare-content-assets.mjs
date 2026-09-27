// Run after changing a crafted landscape. These are derived from existing SVGs,
// not new artwork or a change to the source permissions.
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
const scenes = JSON.parse(
  await readFile("data/scene-backgrounds.json", "utf8"),
);
await mkdir("public/starter-previews", { recursive: true });
await mkdir("public/starter-downloads", { recursive: true });
for (const scene of scenes) {
  const slug = scene.src.split("/").pop().replace(".svg", "");
  await sharp(`public${scene.src}`)
    .resize(600, 400)
    .webp({ quality: 82 })
    .toFile(`public/starter-previews/${slug}.webp`);
  await sharp(`public${scene.src}`)
    .resize(1200, 800)
    .png()
    .toFile(`public/starter-downloads/${slug}.png`);
}
await sharp(`public${scenes[0].src}`)
  .resize(1200, 630)
  .jpeg({ quality: 85 })
  .toFile("public/social-preview.jpg");
console.log(
  `Prepared ${scenes.length} starter previews and downloads, plus the social preview.`,
);
