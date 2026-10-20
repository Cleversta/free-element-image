import { moodSvg } from "../scene-mood.ts";
import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import assets from "../../data/assets.json" with { type: "json" };
import rights from "../../data/publishing-rights.json" with { type: "json" };
import { savedBackgrounds } from "../backgrounds.ts";
import {
  restoreScene,
  serializeScene,
  sceneDimensions,
  itemDimensions,
  photoPlacement,
  photoAdjustments,
} from "../scene.ts";
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
  if (typeof raw !== "string" || raw.length > 3 * 1024 * 1024)
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
  async function photoSource(src: string, background = false) {
    verified = false;
    try {
      const bytes = Buffer.from(src.split(",")[1], "base64");
      const image = sharp(bytes, {
        limitInputPixels: 20_000_000,
        failOn: "warning",
      });
      const metadata = await image.metadata();
      if (
        !["jpeg", "png", "webp"].includes(metadata.format || "") ||
        (metadata.pages || 1) !== 1 ||
        !metadata.width ||
        !metadata.height ||
        metadata.width > 4096 ||
        metadata.height > 4096
      )
        throw new Error();
      const normalized = image.rotate().resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      });
      let output = await (
        background
          ? normalized.jpeg({ quality: 80 })
          : normalized.webp({ quality: 80 })
      ).toBuffer();
      if (output.length > 1_450_000)
        output = await (
          background
            ? normalized
                .resize({
                  width: 1280,
                  height: 1280,
                  fit: "inside",
                  withoutEnlargement: true,
                })
                .jpeg({ quality: 60 })
            : normalized
                .resize({
                  width: 1280,
                  height: 1280,
                  fit: "inside",
                  withoutEnlargement: true,
                })
                .webp({ quality: 60 })
        ).toBuffer();
      if (output.length > 1_450_000) throw new Error();
      return {
        bytes: output,
        src: `data:image/${background ? "jpeg" : "webp"};base64,${output.toString("base64")}`,
      };
    } catch {
      throw new SubmissionError(
        400,
        "A photo could not be processed. Upload a JPG, PNG, or WebP image up to 4096 pixels per edge.",
      );
    }
  }
  if (scene.baseBg.photo && scene.baseBg.src) {
    const normalized = await photoSource(scene.baseBg.src, true);
    scene.baseBg = { ...scene.baseBg, src: normalized.src };
  }
  for (const item of scene.items) {
    if (item.asset.photo) {
      const normalized = await photoSource(item.asset.src);
      item.asset = { ...item.asset, src: normalized.src };
    }
  }
  const buffers = new Map<string, Buffer>();
  async function source(src: string, name: string) {
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
          `The artwork “${name}” cannot be published. Remove it or choose another element.`,
        );
      verified = verified && assetVerified(src, bytes);
      buffers.set(src, bytes);
    }
    return buffers.get(src)!;
  }
  const dataImage = (bytes: Buffer) =>
    `data:image/png;base64,${bytes.toString("base64")}`;
  const { width: canvasWidth, height: canvasHeight } = sceneDimensions(scene);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><rect width="${canvasWidth}" height="${canvasHeight}" fill="${scene.baseBg.sky}"/><rect y="${canvasHeight * 0.45}" width="${canvasWidth}" height="${canvasHeight * 0.55}" fill="${scene.baseBg.ground}"/>`,
  ];
  if (scene.baseBg.src) {
    if (scene.baseBg.photo) {
      const bytes = Buffer.from(scene.baseBg.src.split(",")[1], "base64");
      const info = await sharp(bytes).metadata();
      const rect = photoPlacement(
        info.width!,
        info.height!,
        canvasWidth,
        canvasHeight,
        scene.baseBg.crop,
      );
      const a = photoAdjustments(scene.baseBg.adjustments);
      const slope = a.brightness * a.contrast,
        intercept = (1 - a.contrast) / 2;
      parts.push(
        `<defs><filter id="photo-adjustments" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${slope}" intercept="${intercept}"/><feFuncG type="linear" slope="${slope}" intercept="${intercept}"/><feFuncB type="linear" slope="${slope}" intercept="${intercept}"/></feComponentTransfer><feColorMatrix type="saturate" values="${a.saturation}"/></filter></defs><g transform="translate(${rect.x + rect.width / 2} ${rect.y + rect.height / 2}) rotate(${rect.rotation}) scale(${rect.flipX ? -1 : 1} ${rect.flipY ? -1 : 1})"><image href="${scene.baseBg.src}" x="${-rect.width / 2}" y="${-rect.height / 2}" width="${rect.width}" height="${rect.height}" preserveAspectRatio="none" filter="url(#photo-adjustments)"/></g>`,
      );
    } else {
      const image = await sharp(
        await source(scene.baseBg.src, scene.baseBg.name),
      )
        .resize(canvasWidth, canvasHeight, {
          fit: scene.size && scene.size !== "landscape" ? "cover" : "fill",
        })
        .png()
        .toBuffer();
      parts.push(
        `<image href="${dataImage(image)}" width="${canvasWidth}" height="${canvasHeight}"/>`,
      );
    }
  }
  let index = 0;
  for (const item of [...scene.items].sort((a, b) => a.z - b.z)) {
    if (item.hidden) continue;
    const { width, height } = itemDimensions(item);
    const { data, info } = await sharp(
      item.asset.text || item.asset.shape
        ? Buffer.from(decodeURIComponent(item.asset.src.split(",")[1]))
        : item.asset.photo
          ? Buffer.from(item.asset.src.split(",")[1], "base64")
          : await source(item.asset.src, item.asset.variant.replace(/-/g, " ")),
    )
      .resize({
        width: Math.ceil(width),
        height: Math.ceil(height),
        fit: "inside",
      })
      .png()
      .toBuffer({ resolveWithObject: true });
    if (item.asset.text) verified = false;
    const filter = `hue${index++}`;
    parts.push(
      `<defs><filter id="${filter}" color-interpolation-filters="sRGB"><feColorMatrix type="hueRotate" values="${item.hue}"/></filter></defs><g transform="translate(${(item.x * canvasWidth) / 100 + width / 2} ${(item.y * canvasHeight) / 100 + height / 2}) rotate(${item.rotation}) scale(${item.flipX ? -1 : 1} ${item.flipY ? -1 : 1})" opacity="${item.opacity}"><image href="${dataImage(data)}" x="${-info.width / 2}" y="${-info.height / 2}" width="${info.width}" height="${info.height}" filter="url(#${filter})"/></g>`,
    );
  }
  parts.push(moodSvg(scene.mood, canvasWidth, canvasHeight));
  parts.push("</svg>");
  const png = await sharp(Buffer.from(parts.join("")), {
    limitInputPixels: 1080 * 1920,
  })
    .png()
    .toBuffer();
  const thumbnail = await sharp(png)
    .resize(480, 320, { fit: "inside" })
    .webp({ quality: 80 })
    .toBuffer();
  if (Buffer.byteLength(serializeScene(scene), "utf8") > 3 * 1024 * 1024)
    throw new SubmissionError(
      400,
      "This photo scene is too large to publish. Remove some uploaded photos and try again.",
    );
  return {
    png,
    thumbnail,
    verified,
    editableScene: serializeScene(scene),
    width: canvasWidth,
    height: canvasHeight,
  };
}
