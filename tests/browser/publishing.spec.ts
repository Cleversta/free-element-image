import { test, expect } from "@playwright/test";

test("unconfigured publishing leaves editing and downloads available", async ({
  page,
}) => {
  await page.route("**/api/publish", (route) =>
    route.fulfill({ json: { enabled: false, siteKey: null } }),
  );
  await page.goto("/create");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText("Publishing is not available yet.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close publishing" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Download PNG", exact: false }),
  ).toBeEnabled();
});

test("anonymous publish requires consent, sends scene data and keeps a private receipt", async ({
  page,
}) => {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile = { render: (el, options) => { window.testChallenge = options.callback; options.callback('test-verification'); return 'test-widget'; }, reset: () => { window.testChallenge('test-verification'); }, remove: () => {} };`,
    }),
  );
  let submissions = 0;
  let token = "";
  await page.route("**/api/publish", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { enabled: true, siteKey: "test-widget" } });
    const body = route.request().postDataJSON();
    expect(body.title).toBe("Quiet mountain lake");
    expect(body.consent).toBe(true);
    expect(body.png).toBeUndefined();
    expect(JSON.parse(body.scene).version).toBe(2);
    expect(body.managementToken).toMatch(/^[a-f0-9]{64}$/);
    token = body.managementToken;
    submissions++;
    await route.fulfill({
      status: 201,
      json: { id: "test-submission", status: "pending" },
    });
  });
  await page.goto("/create");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByLabel("Image title").fill("Quiet mountain lake");
  await expect(
    page.getByRole("button", { name: "Publish scene" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publish scene" }).click();
  await expect(
    page.getByRole("heading", { name: "Submitted for review" }),
  ).toBeVisible();
  expect(submissions).toBe(1);
  await expect(page.getByLabel("Private management link")).toHaveValue(
    new RegExp(`/manage#${token}$`),
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("freelement-last-submission"),
    ),
  ).toContain(`/manage#${token}`);
});

test("failed submission preserves its management link and permits retry", async ({
  page,
}) => {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile = { render: (el, options) => { window.testChallenge = options.callback; options.callback('test'); return 'widget'; }, reset: () => { window.testChallenge('test'); }, remove: () => {} };`,
    }),
  );
  let calls = 0;
  let firstToken = "";
  await page.route("**/api/publish", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { enabled: true, siteKey: "test" } });
    const { managementToken } = route.request().postDataJSON();
    calls++;
    if (calls === 1) {
      firstToken = managementToken;
      return route.fulfill({
        status: 503,
        json: { error: "Temporary upload failure" },
      });
    }
    expect(managementToken).toBe(firstToken);
    return route.fulfill({
      status: 201,
      json: { id: "test", status: "pending" },
    });
  });
  await page.goto("/create");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByLabel("Image title").fill("Retry scene");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Publish scene" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Temporary upload failure",
  );
  await expect(page.getByLabel("Private management link")).toBeVisible();
  await page.getByRole("button", { name: "Publish scene" }).click();
  await expect(
    page.getByRole("heading", { name: "Submitted for review" }),
  ).toBeVisible();
});

test("private management uses a fragment and deletion requires confirmation", async ({
  page,
}) => {
  const token = "a".repeat(64);
  let deleted = false;
  await page.route("**/api/submissions/manage", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.managementToken).toBe(token);
    expect(route.request().url()).not.toContain(token);
    if (body.action === "delete") deleted = true;
    await route.fulfill({
      json: { title: "Quiet lake", status: deleted ? "deleted" : "pending" },
    });
  });
  await page.goto(`/manage#${token}`);
  await expect(page.getByRole("status")).toContainText(
    "private and waiting for review",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await page.getByRole("button", { name: "Remove submission" }).click();
  expect(deleted).toBe(false);
  await page.getByRole("button", { name: "Yes, remove image" }).click();
  await expect(page.getByRole("status")).toContainText(
    "image files have been removed",
  );
  expect(deleted).toBe(true);
});

test("automatically published scenes show the public page link", async ({
  page,
}) => {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile={render:(el,o)=>{o.callback('test');return 'widget'},reset:()=>{},remove:()=>{}};`,
    }),
  );
  await page.route("**/api/publish", (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? { enabled: true, siteKey: "test" }
          : { id: "test", status: "published", slug: "scene-test" },
    }),
  );
  await page.goto("/create");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByLabel("Image title").fill("Mountain lake");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Publish scene", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your scene is published" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View public image" }),
  ).toHaveAttribute("href", "/images/scene-test");
});
