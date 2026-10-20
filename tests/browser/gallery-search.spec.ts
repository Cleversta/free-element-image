import { test, expect } from "@playwright/test";
test("gallery filters are shareable and can be cleared on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/gallery");
  await page
    .getByRole("searchbox", { name: "Search titles" })
    .fill("Sunset & hills");
  await page.getByLabel("Category", { exact: true }).selectOption("mountains");
  await page.getByLabel("Sort by", { exact: true }).selectOption("oldest");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=Sunset.*category=mountains/);
  await expect(page).toHaveURL(/sort=oldest/);
  await expect(page.getByLabel("Sort by", { exact: true })).toHaveValue(
    "oldest",
  );
  await expect(page.getByRole("searchbox")).toHaveValue("Sunset & hills");
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue(
    "mountains",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByLabel("Sort by", { exact: true })).toHaveValue(
    "newest",
  );
});
