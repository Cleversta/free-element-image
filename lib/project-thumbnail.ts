import { renderScene } from "./export";
import type { Scene } from "./scene";

export async function projectThumbnail(
  scene: Scene,
): Promise<Blob | undefined> {
  try {
    const image = await createImageBitmap(await renderScene(scene));
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(320 / image.width, 240 / image.height);
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas
        .getContext("2d")
        ?.drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve) =>
        canvas.toBlob(
          (value) => resolve(value || undefined),
          "image/webp",
          0.8,
        ),
      );
    } finally {
      image.close();
    }
  } catch {
    return undefined;
  }
}
