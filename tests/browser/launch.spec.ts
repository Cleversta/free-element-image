import { test, expect } from "@playwright/test";

test("public content has distinct metadata and complete static sitemap entries", async ({
  page,
  request,
}) => {
  for (const path of [
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/image-use",
    "/guides",
    "/scenes",
  ]) {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${path}$`),
    );
    expect((await page.title()).match(/Freelement Images/g)?.length).toBe(1);
  }
  const sitemap = await request.get("/sitemaps/main.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/scenes/alpine-mirror-lake");
  expect(await sitemap.text()).toContain("/guides/your-first-landscape");
  await page.goto("/gallery?page=2");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/gallery\?page=2$/,
  );
  await page.goto("/gallery?q=lake");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("starter scenes open in the editor and content fits a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/scenes/alpine-mirror-lake");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Alpine Mirror Lake",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Edit this starter scene" }).click();
  await expect(page.getByRole("status")).toContainText("Editing a copy");
  await page.goto("/guides/your-first-landscape");
  await expect(
    page.getByRole("navigation", { name: "On this page" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
