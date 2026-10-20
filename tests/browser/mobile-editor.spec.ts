import { test, expect } from "@playwright/test";
test("phone editor shows panels on demand and a touch toolbar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  const dock = page.getByRole("navigation", { name: "Mobile editor panels" });
  await expect(dock).toBeVisible();
  await expect(page.locator(".visualBgGrid")).toBeHidden();
  await dock.getByRole("button", { name: "Tools", exact: true }).click();
  await page
    .locator(".visualBgGrid button")
    .filter({ hasText: "Cottage Flower Garden" })
    .click();
  await dock.getByRole("button", { name: "Canvas", exact: true }).click();
  await expect(page.locator(".visualBgGrid")).toBeHidden();
  await page.locator(".assetBox").first().click();
  await expect(page.locator(".floatingTools")).toBeVisible();
  await expect(page.locator(".vRight")).toBeVisible();
  const handle = await page.locator(".resizeHandle").first().boundingBox();
  expect(handle!.width).toBeGreaterThanOrEqual(28);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});
