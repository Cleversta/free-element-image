import { HEIGHT, ITEM_HEIGHT, ITEM_WIDTH, WIDTH } from "./scene";
import type { Scene } from "./scene";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(
      () => reject(new Error("An image took too long to load. Try again.")),
      15000,
    );
    image.onload = () => {
      clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(
        new Error(
          "An image could not be loaded. Your scene has not been exported.",
        ),
      );
    };
    image.src = src;
  });
}

export async function renderScene(scene: Scene): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PNG export is unavailable in this browser.");
  ctx.fillStyle = scene.baseBg.sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = scene.baseBg.ground;
  ctx.fillRect(0, HEIGHT * 0.45, WIDTH, HEIGHT * 0.55);
  if (scene.baseBg.src)
    ctx.drawImage(await loadImage(scene.baseBg.src), 0, 0, WIDTH, HEIGHT);
  for (const item of [...scene.items].sort((a, b) => a.z - b.z)) {
    const image = await loadImage(item.asset.src);
    const width = ITEM_WIDTH * item.scale;
    const height = ITEM_HEIGHT * item.scale;
    const fit = Math.min(
      width / image.naturalWidth,
      height / image.naturalHeight,
    );
    const drawWidth = image.naturalWidth * fit;
    const drawHeight = image.naturalHeight * fit;
    ctx.save();
    ctx.translate(
      (item.x / 100) * WIDTH + width / 2,
      (item.y / 100) * HEIGHT + height / 2,
    );
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
    ctx.globalAlpha = item.opacity;
    ctx.filter = `hue-rotate(${item.hue}deg)`;
    ctx.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Unable to create the PNG.")),
      "image/png",
    ),
  );
}
