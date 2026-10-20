import { test, expect } from "@playwright/test";

test("editor save is direct and repeated saves update the homepage scene", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "◇ Objects", exact: true }).click();
  await page.locator(".miniAssetGrid button").first().click();
  await page
    .getByRole("button", { name: "Save to My creations", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved to My creations");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".miniAssetGrid button").first().click();
  await page
    .getByRole("button", { name: "Save to My creations", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved to My creations");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/");
  await expect(page.locator("#my-creations article")).toHaveCount(1);
  await page.locator("#my-creations article a").click();
  await expect(page.locator(".assetBox")).toHaveCount(2);
});

test("saving a new copy is separate from updating the saved scene", async ({
  page,
}) => {
  await page.goto("/create");
  await page
    .getByRole("button", { name: "Save to My creations", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved to My creations");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "My creations" });
  await dialog
    .getByRole("button", { name: "Save this scene", exact: true })
    .click();
  await expect(dialog.locator("article")).toHaveCount(1);
  await dialog
    .getByRole("button", { name: "Save a new copy", exact: true })
    .click();
  await expect(dialog.locator("article")).toHaveCount(2);
  await dialog
    .getByRole("button", { name: "Save this scene", exact: true })
    .click();
  await expect(dialog.locator("article")).toHaveCount(2);
});

test("account-free projects persist, duplicate, rename, export, import and reopen with undo", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "◇ Objects", exact: true }).click();
  await page.locator(".miniAssetGrid button").first().click();
  await page
    .getByRole("button", { name: "Save to My creations", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved to My creations");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "My creations" });
  await dialog.getByLabel("Scene name", { exact: true }).fill("Cozy village");
  await dialog.getByRole("button", { name: "Save this scene" }).click();
  const card = dialog.locator("article").filter({
    has: page.getByRole("heading", { name: "Cozy village", exact: true }),
  });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Save this scene", exact: true })
    .click();
  await expect(dialog.locator("article")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Close My creations" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Save to My creations", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved to My creations");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  await expect(dialog.getByLabel("Scene name", { exact: true })).toHaveValue(
    "Cozy village",
  );
  await dialog
    .getByRole("button", { name: "Save this scene", exact: true })
    .click();
  await expect(dialog.locator("article")).toHaveCount(1);
  await card.getByText("More options", { exact: true }).click();
  await card.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Cozy village copy", exact: true }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Rename", exact: true }).click();
  await card.getByLabel("New scene name").fill("My first village");
  await card.getByRole("button", { name: "Save name" }).click();
  const renamed = dialog.locator("article").filter({
    has: page.getByRole("heading", { name: "My first village", exact: true }),
  });
  await expect(renamed).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await renamed
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.freelement\.json$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  await dialog.getByText("Back up or move scenes", { exact: true }).click();
  await dialog.locator('input[type="file"]').setInputFiles(path!);
  await expect(dialog.locator("article")).toHaveCount(3);
  await dialog.getByRole("button", { name: "Close My creations" }).click();
  await page.reload();
  await page.getByRole("button", { name: "New", exact: false }).first().click();
  await expect(page.locator(".assetBox")).toHaveCount(0);
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  await expect(dialog.locator("article")).toHaveCount(3);
  const copy = dialog.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Cozy village copy",
      exact: true,
    }),
  });
  await copy.getByRole("button", { name: "Open scene", exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(0);
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  await copy.getByText("More options", { exact: true }).click();
  await copy.getByRole("button", { name: "Update with this scene" }).click();
  await copy.getByRole("button", { name: "Confirm update" }).click();
  await expect(dialog.getByRole("status")).toContainText("Scene saved");
  await copy.getByRole("button", { name: "Open scene", exact: true }).click();
  await expect(page.locator(".assetBox")).toHaveCount(0);
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  await copy.getByText("More options", { exact: true }).click();
  await copy.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog.locator("article")).toHaveCount(3);
  await copy.getByRole("button", { name: "Confirm delete" }).click();
  await expect(dialog.locator("article")).toHaveCount(2);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  await dialog.getByRole("button", { name: "Save this scene" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "Browser storage may be full",
  );
  await expect(dialog.locator("article")).toHaveCount(2);
});

test("invalid project files leave the working scene intact on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/create");
  await page.getByRole("button", { name: "◇ Objects", exact: true }).click();
  await page.locator(".miniAssetGrid button").first().click();
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "My creations" });
  await dialog.getByText("Back up or move scenes", { exact: true }).click();
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"other"}'),
  });
  await expect(dialog.getByRole("status")).toContainText(
    "valid Freelement project",
  );
  await expect(dialog.locator("article")).toHaveCount(0);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Close My creations" }).click();
  await expect(page.locator(".assetBox")).toHaveCount(1);
});

test("storage failure keeps the scene available for project export", async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new Error("Storage unavailable");
    };
  });
  await page.goto("/create");
  await page.getByRole("button", { name: "◇ Objects", exact: true }).click();
  await page.locator(".miniAssetGrid button").first().click();
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "My creations" });
  await expect(dialog.getByRole("status")).toContainText(
    "Could not read saved scenes",
  );
  const downloadEvent = page.waitForEvent("download");
  await dialog.getByText("Back up or move scenes", { exact: true }).click();
  await dialog
    .getByRole("button", { name: "Download current scene backup" })
    .click();
  expect((await downloadEvent).suggestedFilename()).toMatch(
    /\.freelement\.json$/,
  );
  await dialog.getByRole("button", { name: "Close My creations" }).click();
  await expect(page.locator(".assetBox")).toHaveCount(1);
});

test("homepage shows browser projects and opens them without replacing the main draft", async ({
  page,
}) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "◇ Objects", exact: true }).click();
  await page.locator(".miniAssetGrid button").first().click();
  await page.getByRole("button", { name: "My creations", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "My creations" });
  await dialog.getByLabel("Scene name", { exact: true }).fill("Home village");
  await dialog.getByRole("button", { name: "Save this scene" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Home village", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close My creations" }).click();
  await page.getByRole("button", { name: "New", exact: false }).first().click();
  await page.locator(".vBrand").focus();
  await page.keyboard.press("Control+s");
  await page.goto("/");
  const section = page.locator("#my-creations");
  await expect(
    section.getByRole("heading", { name: "Home village", exact: true }),
  ).toBeVisible();
  await expect(section.locator("article img")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await section.getByRole("link", { name: /Home village/ }).click();
  await expect(page).toHaveURL(/\/create\?project=/);
  await expect(page.locator(".assetBox")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".assetBox")).toHaveCount(1);
  await page.goto("/create");
  await expect(page.locator(".assetBox")).toHaveCount(0);
  await page.goto("/");
  await section.getByRole("link", { name: "Manage saved scenes" }).click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Home village", exact: true }),
  ).toBeVisible();
});
