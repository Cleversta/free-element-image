import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("text autosaves, restores, exports and supports undo", async ({
  page,
}) => {
  await page.goto("/create");
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
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "local saving and downloading" }),
  ).toBeVisible();
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
