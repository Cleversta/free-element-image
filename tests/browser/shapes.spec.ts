import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("shapes can be styled, restored, undone and downloaded", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Shape tools" }).getByRole("button"),
  ).toHaveCount(32);
  await page.getByRole("button", { name: "Add circle", exact: true }).click();
  await page.getByLabel("Shape fill", { exact: true }).fill("#ff0000");
  await page.getByLabel("Outline width", { exact: true }).fill("8");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.locator(".assetBox").click();
  await expect(page.getByLabel("Shape fill", { exact: true })).toHaveValue(
    "#ff0000",
  );
  await expect(page.getByLabel("Outline width", { exact: true })).toHaveValue(
    "8",
  );
  await page.getByLabel("No fill", { exact: true }).check();
  await page.getByTitle("Undo", { exact: true }).click();
  await page.locator(".assetBox").click();
  await expect(page.getByLabel("No fill", { exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "⇩ Download", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menu")
    .getByRole("button", { name: "Download", exact: true })
    .click();
  const { data } = await sharp((await (await download).path())!)
    .extract({ left: 600, top: 400, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([...data.slice(0, 3)]).toEqual([255, 0, 0]);
});

test("independent sizing and layer controls survive reload and export", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  await page
    .getByRole("button", { name: "Add rectangle", exact: true })
    .click();
  await page.getByLabel("Shape fill", { exact: true }).fill("#ff0000");
  const rectangle = page.locator(".assetBox").first();
  const before = (await rectangle.boundingBox())!;
  await page.getByLabel("Shape width", { exact: true }).fill("600");
  await page.getByLabel("Shape width", { exact: true }).press("Enter");
  await page.getByLabel("Shape height", { exact: true }).fill("100");
  await page.getByLabel("Shape height", { exact: true }).press("Enter");
  const after = (await rectangle.boundingBox())!;
  expect(after.width / before.width).toBeCloseTo(600 / 320, 1);
  expect(after.height / before.height).toBeCloseTo(100 / 270, 1);
  await page.getByRole("button", { name: "Add circle", exact: true }).click();
  const layers = page.getByRole("region", { name: "Layers", exact: true });
  await expect(layers.locator("li").first()).toContainText("Circle");
  await layers
    .getByRole("button", { name: "Move Circle layer backward", exact: true })
    .click();
  await expect(layers.locator("li").first()).toContainText("Rectangle");
  await layers.locator("li").first().dragTo(layers.locator("li").last());
  await expect(layers.locator("li").first()).toContainText("Circle");
  await layers
    .getByRole("button", { name: "Hide Circle layer", exact: true })
    .click();
  await expect(page.locator(".assetBox")).toHaveCount(1);
  await layers
    .getByRole("button", { name: "Lock Circle layer", exact: true })
    .click();
  await expect(
    layers.getByRole("button", { name: "Show Circle layer", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".assetBox")).toHaveCount(1);
  await expect(
    layers.getByRole("button", { name: "Unlock Circle layer", exact: true }),
  ).toBeVisible();
  await layers
    .getByRole("button", { name: "Select Rectangle layer", exact: true })
    .click();
  await expect(page.getByLabel("Shape width", { exact: true })).toHaveValue(
    "600",
  );
  await expect(page.getByLabel("Shape height", { exact: true })).toHaveValue(
    "100",
  );
  await page.getByRole("button", { name: "⇩ Download", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menu")
    .getByRole("button", { name: "Download", exact: true })
    .click();
  const { data } = await sharp((await (await download).path())!)
    .extract({ left: 700, top: 310, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([...data.slice(0, 3)]).toEqual([255, 0, 0]);
  await layers
    .getByRole("button", { name: "Unlock Circle layer", exact: true })
    .click();
  await layers
    .getByRole("button", { name: "Show Circle layer", exact: true })
    .click();
  await expect(page.locator(".assetBox")).toHaveCount(2);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(1);
});

for (const mode of ["scene", "photo"]) {
  test(`decorative effects work in the ${mode} editor`, async ({ page }) => {
    await page.goto(mode === "photo" ? "/create?mode=photo" : "/create");
    await page.getByRole("button", { name: "Shapes", exact: true }).click();
    for (const effect of [
      "blob",
      "organic blob",
      "sparkle",
      "sparkle cluster",
      "soft glow",
      "gradient orb",
      "wave",
      "dotted pattern",
      "cloud blob",
      "tall blob",
      "flower blob",
      "puddle blob",
      "confetti",
      "bokeh",
      "sunburst",
      "halo",
      "concentric rings",
      "light streaks",
      "zigzag",
      "swoosh",
      "heart cluster",
      "star dust",
      "gradient wash",
      "checker pattern",
    ]) {
      await page
        .getByRole("button", {
          name: [
            "blob",
            "organic blob",
            "cloud blob",
            "tall blob",
            "flower blob",
            "puddle blob",
          ].includes(effect)
            ? "Shapes"
            : "Effects",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: `Add ${effect}`, exact: true })
        .click();
    }
    await expect(page.locator(".assetBox")).toHaveCount(24);
    await expect(
      page.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator(".assetBox")).toHaveCount(24);
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "⇩ Download", exact: true }).click();
    await page
      .getByRole("menu")
      .getByRole("button", { name: "Download", exact: true })
      .click();
    expect(
      (await sharp((await (await downloaded).path())!).metadata()).width,
    ).toBe(1200);
  });
}
