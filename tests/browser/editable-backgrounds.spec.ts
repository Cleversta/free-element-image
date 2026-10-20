import { test, expect } from "@playwright/test";

test("Freeimage background objects can be moved, deleted, undone, and reopened", async ({
  page,
}) => {
  await page.goto("/create");
  const choice = page
    .locator(".visualBgGrid button")
    .filter({ hasText: "Cottage Flower Garden" });
  await choice.click();
  await expect(page.locator(".assetBox")).toHaveCount(6);
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    /cottage-flower-garden-base\.svg/,
  );
  const house = page
    .locator(".assetBox")
    .filter({ has: page.locator('img[src*="purple-cottage"]') });
  const before = await house.boundingBox();
  if (!before) throw new Error("House is missing");
  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width / 2 + 65,
    before.y + before.height / 2 + 25,
    { steps: 5 },
  );
  await page.mouse.up();
  const after = await house.boundingBox();
  expect(after!.x).toBeGreaterThan(before.x + 40);
  await page.keyboard.press("Delete");
  await expect(page.locator(".assetBox")).toHaveCount(5);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(6);
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".assetBox")).toHaveCount(6);
  await choice.click();
  await expect(page.locator(".assetBox")).toHaveCount(6);
});

test("previously flattened Freeimage drafts become editable on load", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "freelement-scene",
      JSON.stringify({
        version: 2,
        baseBg: {
          name: "Cottage Flower Garden",
          src: "/assets/element-scenes/cottage-flower-garden.svg",
        },
        items: [],
      }),
    ),
  );
  await page.goto("/create");
  await expect(page.locator(".assetBox")).toHaveCount(6);
  await expect(page.locator(".sceneBackground")).toHaveAttribute(
    "src",
    /cottage-flower-garden-base\.svg/,
  );
});

test("changing backgrounds replaces built-in objects and undo restores them", async ({
  page,
}) => {
  await page.goto("/create");
  await page
    .locator(".visualBgGrid button")
    .filter({ hasText: "Cottage Flower Garden" })
    .click();
  await expect(page.locator(".assetBox")).toHaveCount(6);
  await page
    .locator(".visualBgGrid button")
    .filter({ hasText: "Apple Orchard Lane" })
    .click();
  await expect(page.locator(".assetBox")).toHaveCount(5);
  await page
    .locator(".visualBgGrid button")
    .filter({ hasText: "Meadow Colors" })
    .click();
  await expect(page.locator(".assetBox")).toHaveCount(0);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(5);
});
