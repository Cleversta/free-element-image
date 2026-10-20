import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

test("photo entry supports adjustments, elements, saves, exports and submission for review", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/publish", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { enabled: true, siteKey: "test-site" } });
    submitted = route.request().postDataJSON();
    return route.fulfill({
      json: { id: "11111111-1111-4111-8111-111111111111", status: "pending" },
    });
  });
  await page.route(
    "https://challenges.cloudflare.com/turnstile/v0/api.js**",
    (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: "window.turnstile={render:(el,opts)=>{opts.callback('test-token');return 'test'},remove:()=>{},reset:()=>{}};",
      }),
  );
  await page.goto("/");
  await page.getByRole("link", { name: /Edit a photo/ }).click();
  await expect(page).toHaveURL(/mode=photo/);
  await expect(
    page.getByRole("button", { name: "Backgrounds", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".visualBgGrid")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Random", exact: false }),
  ).toHaveCount(0);
  await expect(page.locator(".sceneBackground")).toHaveCount(0);
  const patch = await sharp({
    create: { width: 200, height: 100, channels: 3, background: "#305080" },
  })
    .png()
    .toBuffer();
  const photo = await sharp({
    create: { width: 500, height: 500, channels: 3, background: "#965030" },
  })
    .composite([{ input: patch, left: 0, top: 0 }])
    .png()
    .toBuffer();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Choose a photo", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({ name: "photo.png", mimeType: "image/png", buffer: photo });
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );
  await expect(page.getByLabel("Canvas size", { exact: true })).toHaveValue(
    "square",
  );
  await page.getByText("Adjust colors", { exact: true }).click();
  await page.getByText("Crop & rotate options", { exact: true }).click();
  await page.getByLabel("Photo brightness", { exact: true }).fill("1.2");
  await page.getByLabel("Photo contrast", { exact: true }).fill("1.1");
  await page.getByLabel("Photo saturation", { exact: true }).fill("0.5");
  await page
    .getByLabel("Canvas size", { exact: true })
    .selectOption("vertical");
  await page
    .getByRole("button", { name: "Rotate right 90°", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Flip horizontally", exact: true })
    .click();
  await page.getByLabel("Photo zoom", { exact: true }).fill("1.2");
  await page
    .getByRole("button", { name: "Crop on photo", exact: true })
    .click();
  await page.getByText("Adjust colors", { exact: true }).click();
  await page.getByText("Crop & rotate options", { exact: true }).click();
  const canvas = page.getByLabel("Scene canvas", { exact: true });
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + 100);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + 1005, {
    steps: 5,
  });
  await page.mouse.up();
  const draggedX = await page
    .getByLabel("Horizontal position", { exact: true })
    .inputValue();
  expect(Number(draggedX)).toBeLessThan(50);
  await page.getByRole("button", { name: /Undo/ }).click();
  await expect(
    page.getByLabel("Horizontal position", { exact: true }),
  ).toHaveValue("50");
  await page.getByRole("button", { name: /Redo/ }).click();
  await expect(
    page.getByLabel("Horizontal position", { exact: true }),
  ).toHaveValue(draggedX);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByLabel("Crop photo directly", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Add elements", exact: true }).click();
  await page.locator(".miniAssetGrid button").first().click();
  await expect(page.locator(".assetBox")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Save to My creations", exact: true })
    .click();
  await expect(page.locator("[role=status]")).toContainText(
    "Saved to My creations",
  );
  await page.reload();
  await expect(
    page.getByLabel("Photo brightness", { exact: true }),
  ).toHaveValue("1.2");
  await expect(page.locator(".assetBox")).toHaveCount(1);
  const raw = await page.evaluate(() =>
    localStorage.getItem("freelement-scene-photo-editor"),
  );
  expect(raw).toBeTruthy();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "⇩ Download", exact: true }).click();
  await page
    .getByRole("menu")
    .getByRole("button", { name: "Download", exact: true })
    .click();
  const browserBytes = await readFile((await (await downloaded).path())!);
  const serverBytes = execFileSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--experimental-strip-types",
      "--input-type=module",
      "-e",
      "import {readFileSync} from 'node:fs';import {renderSubmission} from './lib/server/render-submission.ts';process.stdout.write((await renderSubmission(readFileSync(0,'utf8'))).png);",
    ],
    { input: raw!, maxBuffer: 8 * 1024 * 1024 },
  );
  const browserPixels = await sharp(browserBytes)
    .removeAlpha()
    .raw()
    .toBuffer();
  const serverPixels = await sharp(serverBytes).removeAlpha().raw().toBuffer();
  expect(serverPixels.length).toBe(browserPixels.length);
  let error = 0;
  for (let i = 0; i < browserPixels.length; i++)
    error += Math.abs(browserPixels[i] - serverPixels[i]);
  expect(error / browserPixels.length).toBeLessThan(5);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Image title", { exact: true })
    .fill("Photo with a tree");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Submitted for review" }),
  ).toBeVisible();
  const data = JSON.parse(submitted!.scene as string);
  expect(data.baseBg.photo).toBe(true);
  expect(data.baseBg.adjustments.brightness).toBe(1.2);
  expect(data.items).toHaveLength(1);
  expect(data.baseBg.crop.rotation).toBe(90);
  expect(data.baseBg.crop.flipX).toBe(true);
  expect(data.size).toBe("vertical");
});
