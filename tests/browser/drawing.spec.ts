import { test, expect } from "@playwright/test";
for (const mode of ["scene", "photo"]) {
  test(`drawing layers save and undo in ${mode}`, async ({ page }) => {
    if (mode === "photo")
      await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(mode === "photo" ? "/create?mode=photo" : "/create");
    await page.getByRole("button", { name: "Draw", exact: true }).click();
    await page.getByLabel("Brush color", { exact: true }).fill("#e84c76");
    const surface = page.getByLabel("Drawing canvas", { exact: true });
    await surface.scrollIntoViewIfNeeded();
    const r = (await surface.boundingBox())!;
    await page.mouse.move(r.x + 80, r.y + 80);
    await page.mouse.down();
    await page.mouse.move(r.x + 180, r.y + 100, { steps: 10 });
    await page.mouse.move(r.x + 220, r.y + 160, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator(".assetBox")).toHaveCount(1);
    await page.getByTitle("Undo", { exact: true }).click();
    await expect(page.locator(".assetBox")).toHaveCount(0);
    await page.getByTitle("Redo", { exact: true }).click();
    await expect(page.locator(".assetBox")).toHaveCount(1);
    await expect(
      page.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.locator(".assetBox").click();
    await expect(page.getByLabel("Shape outline", { exact: true })).toHaveValue(
      "#e84c76",
    );
  });
}
