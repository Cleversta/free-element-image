import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { readFile } from "node:fs/promises";

test("curated backgrounds switch cleanly and retired saved artwork still loads", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/create");
  const choices = page.locator(".visualBgGrid button");
  await expect(choices).toHaveCount(18);
  await expect(
    choices.filter({ hasText: /^Mountains Landscape$/ }),
  ).toHaveCount(0);
  for (const [name, slug] of [
    ["Alpine Mirror Lake", "alpine-mirror-lake"],
    ["Sunlit Coastal Cove", "sunlit-coastal-cove"],
  ]) {
    const choice = choices.filter({ hasText: new RegExp(`^${name}$`) });
    await choice.click();
    await expect(
      page.locator('.visualBgGrid button[aria-pressed="true"]'),
    ).toHaveCount(1);
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".sceneBackground")).toHaveAttribute(
      "src",
      new RegExp(slug),
    );
  }
  await page.getByRole("button", { name: "Save", exact: false }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    /sunlit-coastal-cove/,
  );
  // Restore the second of the old same-name mountains, now removed from the picker.
  await page.evaluate(() =>
    localStorage.setItem(
      "freelement-scene",
      JSON.stringify({
        baseBg: {
          name: "Mountains Landscape",
          src: "/assets/vector-countryside/backgrounds/mountains-002.svg",
        },
        items: [],
      }),
    ),
  );
  await page.reload();
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    /mountains-002/,
  );
  await expect(
    page.getByText(
      "Your saved background is preserved. Choose a scene to replace it.",
    ),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

async function addTree(page: Page) {
  await page
    .getByRole("button", { name: "Objects", exact: false })
    .first()
    .click();
  await page.getByLabel("Artwork collection").selectOption("freeimage");
  await page.getByLabel("Search elements").fill("leafy tree");
  await page.locator(".miniAssetGrid button").first().click();
  await expect(page.locator(".assetBox")).toHaveCount(1);
}

test("landing page opens the editor and imported categories are reachable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Start creating" }).click();
  await expect(page).toHaveURL(/\/create$/);
  await addTree(page);
  await page.getByLabel("Search elements").fill("");
  await page
    .locator(".categoryTiles button")
    .filter({ hasText: "Grass" })
    .click();
  await expect(page.locator(".miniAssetGrid button").first()).toBeVisible();
  await page.getByRole("button", { name: "✧ Village", exact: true }).click();
  await expect(page.locator(".categoryTiles .on")).toContainText(
    "Garden Equipment",
  );
  await expect(page.locator(".miniAssetGrid button").first()).toBeVisible();
  await page
    .getByRole("button", { name: "More", exact: false })
    .first()
    .click();
  await expect(page.locator(".categoryTiles .on")).toContainText("Sky");
  expect(errors).toEqual([]);
});

test("add, drag, resize, lock, delete and undo/redo work as complete actions", async ({
  page,
}) => {
  await page.goto("/create");
  await addTree(page);
  const item = page.locator(".assetBox");
  const original = await item.boundingBox();
  expect(original).not.toBeNull();
  await page.mouse.move(
    original!.x + original!.width / 2,
    original!.y + original!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    original!.x + original!.width / 2 + 65,
    original!.y + original!.height / 2 + 25,
    { steps: 12 },
  );
  await page.mouse.up();
  expect((await item.boundingBox())!.x).toBeCloseTo(original!.x + 65, 0);
  await page.getByTitle("Undo", { exact: true }).click();
  expect((await item.boundingBox())!.x).toBeCloseTo(original!.x, 0);
  await page.getByTitle("Redo", { exact: true }).click();
  expect((await item.boundingBox())!.x).toBeCloseTo(original!.x + 65, 0);
  await item.click();
  const before = await item.boundingBox();
  const handle = await item.locator(".resizeHandle.se").boundingBox();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle!.x + handle!.width / 2 + 50,
    handle!.y + handle!.height / 2 + 40,
    { steps: 10 },
  );
  await page.mouse.up();
  expect((await item.boundingBox())!.width).toBeGreaterThan(before!.width + 20);
  await page.getByTitle("Undo", { exact: true }).click();
  expect((await item.boundingBox())!.width).toBeCloseTo(before!.width, 0);
  await item.click();
  await page.getByRole("button", { name: "Lock element", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Size", exact: true }),
  ).toBeDisabled();
  await expect(item.locator(".resizeHandle")).toHaveCount(0);
  await expect(
    page.locator(".floatingTools").getByTitle("Delete", { exact: true }),
  ).toBeDisabled();
  await item.focus();
  await page.keyboard.press("Delete");
  await expect(item).toHaveCount(1);
  await page
    .getByRole("button", { name: "Unlock element", exact: true })
    .click();
  await page
    .locator(".floatingTools")
    .getByTitle("Delete", { exact: true })
    .click();
  await expect(item).toHaveCount(0);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(item).toHaveCount(1);
});

test("backgrounds, property changes, saving, reloading, and New preserve history", async ({
  page,
}) => {
  await page.goto("/create");
  const originalSrc = await page
    .locator(".sceneBackground")
    .getAttribute("src");
  await page
    .locator(".visualBgGrid button")
    .filter({ hasText: /^Lake Sunset$/ })
    .click();
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    /lake-sunset/,
  );
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    originalSrc!,
  );
  await page.getByTitle("Redo", { exact: true }).click();
  await addTree(page);
  await page.getByRole("button", { name: "150%", exact: true }).click();
  await page.getByRole("slider", { name: "Rotation", exact: true }).fill("45");
  await page.getByRole("button", { name: "Save", exact: false }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(page.locator(".assetBox")).toHaveCount(1);
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    /lake-sunset/,
  );
  await page.locator(".assetBox").click();
  await expect(
    page.getByRole("slider", { name: "Size", exact: true }),
  ).toHaveValue("150");
  await expect(
    page.getByRole("slider", { name: "Rotation", exact: true }),
  ).toHaveValue("45");
  await page.getByRole("button", { name: "New", exact: false }).click();
  await expect(page.locator(".assetBox")).toHaveCount(0);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(1);
});

test("corrupt storage and failed image exports show errors without crashing", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("freelement-scene", "{bad json"),
  );
  await page.goto("/create");
  await expect(page.getByRole("status")).toContainText("could not be loaded");
  await addTree(page);
  await page.route("**/assets/**", (route) => route.abort());
  // A fresh failing image request makes export fail visibly instead of silently skipping it.
  await page.evaluate(() => {
    const original = window.Image;
    window.Image = class extends original {
      set src(_value: string) {
        queueMicrotask(() => this.dispatchEvent(new Event("error")));
      }
    };
  });
  await page
    .getByRole("button", { name: "Download PNG", exact: false })
    .click();
  await expect(page.getByRole("status")).toContainText("could not be loaded");
  await expect(page.locator(".assetBox")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Download PNG", exact: false }),
  ).toBeEnabled();
});

test("PNG matches the scene composition, transforms, and SVG background", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1900, height: 1200 });
  await page.goto("/create");
  await addTree(page);
  await page.getByRole("button", { name: "150%", exact: true }).click();
  await page.getByRole("slider", { name: "Rotation", exact: true }).fill("30");
  await page.getByRole("slider", { name: "Opacity", exact: true }).fill("70");
  await page.getByRole("slider", { name: "Color", exact: true }).fill("90");
  await page.locator(".twoBtns button").first().click();
  await page.locator(".vBoard").click({ position: { x: 10, y: 10 } });
  await page
    .locator(".vBoard img")
    .evaluateAll((images) =>
      Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
    );
  const preview = await page.locator(".vBoard").screenshot();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download PNG", exact: false })
    .click();
  const file = await downloaded;
  const png = await readFile((await file.path())!);
  const metadata = await sharp(png).metadata();
  expect(metadata.width).toBe(1200);
  expect(metadata.height).toBe(800);
  const crop = { left: 12, top: 12, width: 1176, height: 776 };
  const actual = await sharp(png).removeAlpha().extract(crop).raw().toBuffer();
  const expected = await sharp(preview)
    .resize(1200, 800)
    .removeAlpha()
    .extract(crop)
    .raw()
    .toBuffer();
  let error = 0;
  for (let index = 0; index < actual.length; index++)
    error += Math.abs(actual[index] - expected[index]);
  expect(error / actual.length).toBeLessThan(3);
  await testInfo.attach("export", { body: png, contentType: "image/png" });
  await testInfo.attach("editor-preview", {
    body: preview,
    contentType: "image/png",
  });
});

test("mobile retains canvas proportions and supports adding, editing and undo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  await addTree(page);
  const board = await page.locator(".vBoard").boundingBox();
  const item = await page.locator(".assetBox").boundingBox();
  expect(board!.width / board!.height).toBeCloseTo(1.5, 2);
  expect(item!.width / board!.width).toBeCloseTo((320 * 1.1) / 1200, 2);
  await page.getByRole("button", { name: "200%", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Size", exact: true }),
  ).toHaveValue("200");
  await page.getByTitle("Undo", { exact: true }).click();
  expect(
    (await page.locator(".assetBox").boundingBox())!.width / board!.width,
  ).toBeCloseTo((320 * 1.1) / 1200, 2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("random scenes reuse the background sky and can be undone", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "Random", exact: false }).click();
  expect(await page.locator(".assetBox").count()).toBeGreaterThan(8);
  await expect(page.locator(".sceneBackground")).toHaveCount(1);
  await expect(page.locator('.assetBox img[src*="/sky/"]')).toHaveCount(0);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(0);
});
