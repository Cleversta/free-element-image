import { test, expect } from "@playwright/test";
import sharp from "sharp";
import type { Page } from "@playwright/test";

async function download(page: Page) {
  await page.getByRole("button", { name: "⇩ Download", exact: true }).click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("menu")
    .getByRole("button", { name: "Download", exact: true })
    .click();
  return (await event).path();
}

test("all canvas presets export correct dimensions, restore and undo", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  for (const [size, width, height] of [
    ["square", 1080, 1080],
    ["portrait", 1080, 1350],
    ["wallpaper", 1080, 1920],
    ["landscape", 1200, 800],
  ] as const) {
    await page.getByLabel("Canvas size", { exact: true }).selectOption(size);
    const box = await page
      .getByLabel("Scene canvas", { exact: true })
      .boundingBox();
    expect(box!.width / box!.height).toBeCloseTo(width / height, 2);
    const path = await download(page);
    const metadata = await sharp(path!).metadata();
    expect([metadata.width, metadata.height]).toEqual([width, height]);
  }
  await page
    .getByLabel("Canvas size", { exact: true })
    .selectOption("portrait");
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.getByLabel("Canvas size", { exact: true })).toHaveValue(
    "landscape",
  );
  await page.getByTitle("Redo", { exact: true }).click();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Canvas size", { exact: true })).toHaveValue(
    "portrait",
  );
  await expect(page.locator(".assetBox")).toHaveCount(1);
});

test("photo framing matches export, survives reload, and resets on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  const buffer = await sharp(
    Buffer.from(
      '<svg width="1200" height="600"><rect width="600" height="600" fill="#ff0000"/><rect x="600" width="600" height="600" fill="#0000ff"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload photo background")
    .setInputFiles({ name: "halves.png", mimeType: "image/png", buffer });
  await page.getByLabel("Canvas size", { exact: true }).selectOption("square");
  await page.getByLabel("Photo zoom", { exact: true }).fill("2");
  for (const [x, channel] of [
    ["0", 0],
    ["100", 2],
  ] as const) {
    await page.getByLabel("Horizontal position", { exact: true }).fill(x);
    const shot = await page
      .getByLabel("Scene canvas", { exact: true })
      .screenshot();
    const preview = await sharp(shot)
      .resize(1, 1)
      .removeAlpha()
      .raw()
      .toBuffer();
    const path = await download(page);
    const exported = await sharp(path!)
      .resize(1, 1)
      .removeAlpha()
      .raw()
      .toBuffer();
    expect(preview[channel]).toBeGreaterThan(240);
    expect(exported[channel]).toBeGreaterThan(240);
  }
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Photo zoom", { exact: true })).toHaveValue("2");
  await expect(
    page.getByLabel("Horizontal position", { exact: true }),
  ).toHaveValue("100");
  await page.getByRole("button", { name: "Reset photo crop" }).click();
  await expect(page.getByLabel("Photo zoom", { exact: true })).toHaveValue("1");
  await expect(
    page.getByLabel("Horizontal position", { exact: true }),
  ).toHaveValue("50");
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.getByLabel("Photo zoom", { exact: true })).toHaveValue("2");
});
