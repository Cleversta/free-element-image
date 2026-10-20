import { test, expect } from "@playwright/test";

test("matching suggestions add personal objects and scene moods survive reload", async ({
  page,
}) => {
  await page.goto("/create");
  await page
    .locator(".visualBgGrid button")
    .filter({ hasText: "Cottage Flower Garden" })
    .click();
  await page.getByLabel("Scene mood", { exact: true }).selectOption("Sunset");
  await expect(page.locator(".sceneMoodOverlay")).toBeVisible();
  await page
    .getByRole("button", { name: "Find elements for this scene" })
    .click();
  const suggestions = page.getByRole("region", {
    name: "Matching scene elements",
  });
  await expect(suggestions).toBeVisible();
  await suggestions.getByRole("button").first().click();
  await expect(page.locator(".assetBox")).toHaveCount(7);
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".sceneMoodOverlay")).toBeVisible();
  await expect(page.locator(".assetBox")).toHaveCount(7);
});

test("flower brush paints editable objects as one undo step", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  await page.getByLabel("Brush type", { exact: true }).selectOption("Flowers");
  const bounds = await page
    .getByLabel("Drawing canvas", { exact: true })
    .boundingBox();
  if (!bounds) throw new Error("Drawing surface missing");
  await page.mouse.move(bounds.x + 100, bounds.y + 100);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 350, bounds.y + 100, { steps: 10 });
  await page.mouse.up();
  expect(await page.locator(".assetBox").count()).toBeGreaterThan(1);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(0);
});

test("multiple objects can be selected and duplicated together", async ({
  page,
}) => {
  await page.goto("/create");
  await page
    .locator(".visualBgGrid button")
    .filter({ hasText: "Cottage Flower Garden" })
    .click();
  const boxes = page.locator(".layerList input[type=checkbox]");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page
    .getByRole("button", { name: "Duplicate selected", exact: true })
    .click();
  await expect(page.locator(".assetBox")).toHaveCount(8);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(6);
});

test("permanent groups move together and survive reopening", async ({
  page,
}) => {
  await page.goto("/create");
  await page
    .locator(".visualBgGrid button")
    .filter({ hasText: "Cottage Flower Garden" })
    .click();
  const boxes = page.locator(".layerList input[type=checkbox]");
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page
    .getByRole("button", { name: "Group selected", exact: true })
    .click();
  await expect(
    page.locator(".layerSelect").filter({ hasText: "· Group" }),
  ).toHaveCount(2);
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".layerSelect").filter({ hasText: "· Group" }),
  ).toHaveCount(2);
  await page
    .locator(".layerSelect")
    .filter({ hasText: "· Group" })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Ungroup objects", exact: true })
    .click();
  await expect(
    page.locator(".layerSelect").filter({ hasText: "· Group" }),
  ).toHaveCount(0);
});
