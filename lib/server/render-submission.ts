import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import assets from "../../data/assets.json" with { type: "json" };
import rights from "../../data/publishing-rights.json" with { type: "json" };
import { savedBackgrounds } from "../backgrounds.ts";
import { restoreScene } from "../scene.ts";
import { SubmissionError } from "./submissions.ts";
const registry: Record<string, { sha256: string; evidence: string }> = rights;
export function textNeedsReview(title: string, description: string) {
  const text = `${title} ${description}`.normalize("NFKC");
  return /https?:|www\.|\b[\w.-]+\.(?:com|net|org|io|xyz)\b|[\w.+-]+@[\w.-]+|<[^>]+>|[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]|(.)\1{7,}|\b(?:buy now|free money|crypto giveaway|casino|porn|sex|fuck|shit|kill yourself)\b/i.test(
    text,
  );
}
export function assetVerified(src: string, bytes: Buffer) {
  const entry = registry[src];
  return (
    !!entry?.evidence &&
    entry.sha256 === createHash("sha256").update(bytes).digest("hex")
  );
}
export async function renderSubmission(raw: unknown) {
  if (typeof raw !== "string" || raw.length > 100000)
    throw new SubmissionError(400, "Submit a scene from the editor.");
  let scene;
  try {
    const data = JSON.parse(raw);
    if (
      data.version !== 2 ||
      !Array.isArray(data.items) ||
      data.items.length > 60
    )
      throw new Error();
    for (const item of data.items) {
      if (
        typeof item.assetId !== "string" ||
        ["x", "y", "scale", "rotation", "opacity", "hue", "z"].some(
          (key) => typeof item[key] !== "number" || !Number.isFinite(item[key]),
        )
      )
        throw new Error();
    }
    scene = restoreScene(raw, assets, savedBackgrounds);
  } catch {
    throw new SubmissionError(
      400,
      "The scene contains unknown artwork or invalid elements. Use at most 60 elements.",
    );
  }
  let verified = true;
  const buffers = new Map<string, Buffer>();
  async function source(src: string) {
    if (!buffers.has(src)) {
      if (!src.startsWith("/assets/") || src.includes(".."))
        throw new Error("Invalid catalog path");
      const bytes = await readFile(path.join(process.cwd(), "public", src));
      const svg = bytes.toString("utf8");
      if (
        bytes.length > 2000000 ||
        /<script|<foreignObject|<!ENTITY|(?:href\s*=\s*["']\s*(?!#)[^"']+)|url\(\s*["']?(?!#)/i.test(
          svg,
        )
      )
        throw new SubmissionError(
          400,
          "This artwork cannot be published. Choose another element.",
        );
      verified = verified && assetVerified(src, bytes);
      buffers.set(src, bytes);
    }
    return buffers.get(src)!;
  }
  const dataImage = (bytes: Buffer) =>
    `data:image/png;base64,${bytes.toString("base64")}`;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${scene.baseBg.sky}"/><rect y="360" width="1200" height="440" fill="${scene.baseBg.ground}"/>`,
  ];
  if (scene.baseBg.src) {
    const image = await sharp(await source(scene.baseBg.src))
      .resize(1200, 800, { fit: "fill" })
      .png()
      .toBuffer();
    parts.push(`<image href="${dataImage(image)}" width="1200" height="800"/>`);
  }
  let index = 0;
  for (const item of [...scene.items].sort((a, b) => a.z - b.z)) {
    const width = 320 * item.scale,
      height = 270 * item.scale;
    const { data, info } = await sharp(await source(item.asset.src))
      .resize({
        width: Math.ceil(width),
        height: Math.ceil(height),
        fit: "inside",
      })
      .png()
      .toBuffer({ resolveWithObject: true });
    const filter = `hue${index++}`;
    parts.push(
      `<defs><filter id="${filter}" color-interpolation-filters="sRGB"><feColorMatrix type="hueRotate" values="${item.hue}"/></filter></defs><g transform="translate(${item.x * 12 + width / 2} ${item.y * 8 + height / 2}) rotate(${item.rotation}) scale(${item.flipX ? -1 : 1} ${item.flipY ? -1 : 1})" opacity="${item.opacity}"><image href="${dataImage(data)}" x="${-info.width / 2}" y="${-info.height / 2}" width="${info.width}" height="${info.height}" filter="url(#${filter})"/></g>`,
    );
  }
  parts.push("</svg>");
  const png = await sharp(Buffer.from(parts.join("")), {
    limitInputPixels: 960000,
  })
    .png()
    .toBuffer();
  const thumbnail = await sharp(png)
    .resize(480, 320)
    .webp({ quality: 80 })
    .toBuffer();
  return { png, thumbnail, verified };
}
