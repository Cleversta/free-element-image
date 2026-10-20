import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("text autosaves, restores, exports and supports undo", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Text content" })
    .fill("Hello village");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".assetBox img")).toHaveCount(1);
  await page.locator(".assetBox").click();
  await expect(page.getByRole("textbox", { name: "Text content" })).toHaveValue(
    "Hello village",
  );
  await page.getByRole("button", { name: "⇩ Download", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("menu")
    .getByRole("button", { name: "Download", exact: true })
    .click();
  const file = await (await downloaded).path();
  expect((await sharp(file!).metadata()).width).toBe(1200);
  await page.getByRole("textbox", { name: "Text content" }).fill("Changed");
  await page.getByTitle("Undo", { exact: true }).click();
  await page.locator(".assetBox").click();
  await expect(page.getByRole("textbox", { name: "Text content" })).toHaveValue(
    "Hello village",
  );
});

test("photo backgrounds survive reload and export locally", async ({
  page,
}) => {
  await page.goto("/create");
  const buffer = await sharp({
    create: { width: 600, height: 900, channels: 3, background: "#cc3344" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload photo background")
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer });
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close publishing", exact: true })
    .click();
  await page.getByRole("button", { name: "⇩ Download", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("menu")
    .getByRole("button", { name: "Download", exact: true })
    .click();
  const file = await (await downloaded).path();
  const { data } = await sharp(file!)
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(data[0]).toBeGreaterThan(190);
  expect(data[1]).toBeLessThan(65);
});

test("uploaded photos are movable objects without replacing the background", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose image", exact: true }),
  ).toBeVisible();
  const background = await page.locator(".sceneBackground").getAttribute("src");
  const buffer = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload photo as an object", { exact: true })
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer });
  const photo = page.locator(".assetBox");
  await expect(photo).toHaveCount(1);
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    background!,
  );
  const before = (await photo.boundingBox())!;
  const canvas = (await page
    .getByLabel("Scene canvas", { exact: true })
    .boundingBox())!;
  expect(before.width).toBeLessThan(canvas.width / 2);
  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width / 2 + 50,
    before.y + before.height / 2 + 30,
  );
  await page.mouse.up();
  expect((await photo.boundingBox())!.x).toBeGreaterThan(before.x + 40);
  await page.getByRole("slider", { name: "Size", exact: true }).fill("150");
  expect((await photo.boundingBox())!.width).toBeGreaterThan(
    before.width * 1.4,
  );
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(photo).toHaveCount(1);
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    background!,
  );
  const src = (await photo.locator("img").getAttribute("src"))!;
  expect(
    (await sharp(Buffer.from(src.split(",")[1], "base64")).metadata()).hasAlpha,
  ).toBe(true);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close publishing", exact: true })
    .click();
  await page.getByRole("button", { name: "⇩ Download", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("menu")
    .getByRole("button", { name: "Download", exact: true })
    .click();
  expect(
    (await sharp((await (await downloaded).path())!).metadata()).width,
  ).toBe(1200);
  await photo.click();
  await page.getByRole("button", { name: "Delete selected element" }).click();
  await expect(photo).toHaveCount(0);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(photo).toHaveCount(1);
});

for (const width of [1440, 390]) {
  test(`text edits directly on the canvas at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/create");
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page.getByRole("button", { name: "Add text", exact: true }).click();
    await page
      .getByLabel("Text font in toolbar", { exact: true })
      .selectOption("mono");
    const text = page.locator(".assetBox").first();
    if (width === 1440) await text.dblclick();
    else {
      await text.click();
      await page
        .getByRole("button", { name: "Edit text", exact: true })
        .click();
    }
    const input = page.getByRole("textbox", {
      name: "Edit text on canvas",
      exact: true,
    });
    const textBounds = (await text.boundingBox())!;
    const editBounds = (await input.boundingBox())!;
    expect(editBounds.y).toBeGreaterThanOrEqual(textBounds.y);
    expect(editBounds.y + editBounds.height).toBeLessThanOrEqual(
      textBounds.y + textBounds.height,
    );
    await expect(input).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(text.locator("img")).toHaveCSS("visibility", "hidden");
    await expect(input).toHaveCSS("font-family", '"Courier New", monospace');
    await input.fill("My photo caption");
    await input.press("Enter");
    await expect(input).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Text content", exact: true }),
    ).toHaveValue("My photo caption");
    await page.getByTitle("Undo", { exact: true }).click();
    await text.click();
    await expect(
      page.getByRole("textbox", { name: "Text content", exact: true }),
    ).not.toHaveValue("My photo caption");
    await page.getByRole("button", { name: "Edit text", exact: true }).click();
    await input.fill("Discard this");
    await input.press("Escape");
    await expect(input).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Text content", exact: true }),
    ).not.toHaveValue("Discard this");
  });
}
