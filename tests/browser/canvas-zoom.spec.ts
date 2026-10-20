import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("mobile zoom and pan preserve the saved scene and fit inside the page", async ({
  page,
}) => {
  await page.goto("/create?template=alpine-mirror-lake");
  await page.locator(".vBrand").focus();
  await page.keyboard.press("Control+s");
  const before = await page.evaluate(() =>
    localStorage.getItem("freelement-scene"),
  );
  const original = await page.locator(".vBoard").boundingBox();
  await page
    .getByRole("slider", { name: "Canvas zoom", exact: true })
    .fill("200");
  await expect(page.locator(".canvasZoomValue")).toHaveText("200%");
  const enlarged = await page.locator(".vBoard").boundingBox();
  expect(enlarged!.width).toBeCloseTo(original!.width * 2, 0);
  expect(enlarged!.width / enlarged!.height).toBeCloseTo(1.5, 2);
  await page.getByRole("button", { name: "Move canvas", exact: true }).click();
  const viewport = page.locator(".canvasViewport");
  await viewport.scrollIntoViewIfNeeded();
  const box = (await viewport.boundingBox())!;
  const left = await viewport.evaluate((el) => el.scrollLeft);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 - 45,
    box.y + box.height / 2 - 20,
    { steps: 4 },
  );
  await page.mouse.up();
  expect(await viewport.evaluate((el) => el.scrollLeft)).toBeGreaterThan(left);
  await page.locator(".vBrand").focus();
  await page.keyboard.press("Control+s");
  expect(
    await page.evaluate(() => localStorage.getItem("freelement-scene")),
  ).toBe(before);
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await expect(page.locator(".canvasZoomValue")).toHaveText("100%");
  await expect(
    page.getByRole("button", { name: "Move canvas" }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(await viewport.evaluate((el) => el.scrollLeft)).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("two-finger pinch enlarges the canvas and Fit scene resets it", async ({
  page,
}) => {
  await page.goto("/create?template=alpine-mirror-lake");
  const viewport = page.locator(".canvasViewport");
  await viewport.scrollIntoViewIfNeeded();
  const box = (await viewport.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 25, y, id: 1 },
      { x: x + 25, y, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 50, y, id: 1 },
      { x: x + 50, y, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".canvasZoomValue")).toHaveText("200%");
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await expect(page.locator(".canvasZoomValue")).toHaveText("100%");
  await cdp.detach();
});

test("objects drag accurately at double zoom and pan mode does not move them", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "freelement-scene",
      JSON.stringify({
        version: 2,
        baseBg: { src: "/assets/crafted-landscapes/alpine-mirror-lake.svg" },
        items: [
          {
            uid: "tree",
            assetId: "freeimage-leafy-tree",
            x: 40,
            y: 40,
            scale: 0.5,
            z: 1,
            rotation: 0,
            opacity: 1,
            hue: 0,
          },
        ],
      }),
    ),
  );
  await page.goto("/create");
  await expect(page.locator(".assetBox")).toHaveCount(1);
  await page
    .getByRole("slider", { name: "Canvas zoom", exact: true })
    .fill("200");
  await page.locator(".canvasViewport").scrollIntoViewIfNeeded();
  const item = page.locator(".assetBox");
  const rect = (await item.boundingBox())!;
  const width = (await page.locator(".vBoard").boundingBox())!.width;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width / 2 + 30,
    rect.y + rect.height / 2,
    { steps: 4 },
  );
  await page.mouse.up();
  const position = await item.evaluate((el) =>
    parseFloat((el as HTMLElement).style.left),
  );
  expect(position).toBeCloseTo(40 + (30 / width) * 100, 1);
  await page.getByRole("button", { name: "Move canvas", exact: true }).click();
  const moved = (await item.boundingBox())!;
  await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    moved.x + moved.width / 2 - 25,
    moved.y + moved.height / 2,
    { steps: 4 },
  );
  await page.mouse.up();
  expect(
    await item.evaluate((el) => parseFloat((el as HTMLElement).style.left)),
  ).toBe(position);
});
