import { test, expect } from "@playwright/test";
const id = "11111111-1111-4111-8111-111111111111";
test("owner sign-in and approval require explicit source confirmation", async ({
  page,
}) => {
  let approved = false;
  await page.route("**/api/admin/session", (route) =>
    route.fulfill({
      status: route.request().method() === "GET" ? 401 : 200,
      json: { signedIn: route.request().method() === "POST" },
    }),
  );
  await page.route("**/api/admin/preview/**", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/admin/review**", (route) => {
    if (route.request().method() === "POST") {
      const data = route.request().postDataJSON();
      expect(data.rightsConfirmed).toBe(true);
      expect(data.action).toBe("approve");
      approved = true;
      return route.fulfill({
        json: { status: "published", slug: `scene-${id}` },
      });
    }
    return route.fulfill({
      json: {
        images: approved
          ? []
          : [
              {
                id,
                title: "Review this lake",
                description: "A lake scene",
                status: "pending",
                slug: `scene-${id}`,
              },
            ],
        more: false,
      },
    });
  });
  await page.goto("/admin");
  await page.getByLabel("Owner access key").fill("test-key-never-real");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review this lake" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve and publish" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Approve and publish" }).click();
  await expect(page.getByRole("status")).toContainText("Published");
  expect(approved).toBe(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Owner access key")).toBeVisible();
});
test("rejection is confirmed separately from approval", async ({ page }) => {
  let rejected = false;
  await page.route("**/api/admin/session", (route) =>
    route.fulfill({ json: { signedIn: true } }),
  );
  await page.route("**/api/admin/preview/**", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/admin/review**", (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON().action).toBe("reject");
      rejected = true;
      return route.fulfill({ json: { status: "rejected" } });
    }
    return route.fulfill({
      json: {
        images: rejected
          ? []
          : [{ id, title: "Unverified scene", status: "pending" }],
        more: false,
      },
    });
  });
  await page.goto("/admin");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  expect(rejected).toBe(false);
  await page.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(page.getByRole("status")).toContainText("Rejected");
  expect(rejected).toBe(true);
});
test("real owner endpoints deny anonymous access without touching submissions", async ({
  request,
}) => {
  for (const path of ["/api/admin/review", `/api/admin/preview/${id}`]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("no-store");
  }
  const response = await request.post("/api/admin/review", {
    data: { id, action: "approve", rightsConfirmed: true },
  });
  expect(response.status()).toBe(401);
});
test("gallery navigation and missing-image downloads work without owner access", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Made by the community" }),
  ).toBeVisible();
  const image = await request.get(`/api/images/scene-${id}/download`);
  expect(image.status()).toBe(404);
  const missingPage = await request.get(`/images/scene-${id}`);
  expect(missingPage.status()).toBe(404);
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /api/admin/");
  await page.goto("/admin");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("owner can inspect reports and confirm removal from the public gallery", async ({
  page,
}) => {
  let removed = false;
  await page.route("**/api/admin/session", (route) =>
    route.fulfill({ json: { signedIn: true } }),
  );
  await page.route("**/api/admin/preview/**", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/admin/review**", (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON().action).toBe("withdraw");
      removed = true;
      return route.fulfill({ json: { status: "rejected" } });
    }
    return route.fulfill({
      json: {
        images:
          route.request().url().includes("reported") && !removed
            ? [
                {
                  id,
                  title: "Reported image",
                  status: "published",
                  slug: `scene-${id}`,
                  reports: [{ id, reason: "spam" }],
                },
              ]
            : [],
        more: false,
      },
    });
  });
  await page.goto("/admin");
  await page.getByLabel("Review queue").selectOption("reported");
  await expect(page.getByText("1 report(s): spam")).toBeVisible();
  await page.getByRole("button", { name: "Remove public image" }).click();
  expect(removed).toBe(false);
  await page.getByRole("button", { name: "Confirm removal" }).click();
  await expect(page.getByRole("status")).toContainText(
    "removed from the public gallery",
  );
  expect(removed).toBe(true);
});
