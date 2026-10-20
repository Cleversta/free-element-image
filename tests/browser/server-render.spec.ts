import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
test("server-rendered scene matches the browser download with transforms", async ({
  page,
}) => {
  await page.goto("/create");
  await page
    .getByRole("button", { name: "Objects", exact: false })
    .first()
    .click();
  await page.locator(".miniAssetGrid button").first().click();
  await page.locator(".vBrand").focus();
  await page.keyboard.press("Control+s");
  const scene = await page.evaluate(() =>
    localStorage.getItem("freelement-scene"),
  );
  expect(scene).toBeTruthy();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "⇩ Download", exact: true }).click();
  await page
    .getByRole("menu", { name: "Download options" })
    .getByRole("button", { name: "Download", exact: true })
    .click();
  const download = await downloadPromise;
  const disk = await download.path();
  expect(disk).toBeTruthy();
  const browser = await sharp(await readFile(disk!))
    .removeAlpha()
    .raw()
    .toBuffer();
  const server = execFileSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--experimental-strip-types",
      "--input-type=module",
      "-e",
      `import {readFileSync} from 'node:fs';import {renderSubmission} from './lib/server/render-submission.ts';const result=await renderSubmission(readFileSync(0,'utf8'));process.stdout.write(result.png);`,
    ],
    { input: scene!, maxBuffer: 5 * 1024 * 1024 },
  );
  const rendered = await sharp(server).removeAlpha().raw().toBuffer();
  expect(rendered.length).toBe(browser.length);
  let total = 0;
  for (let i = 0; i < browser.length; i++)
    total += Math.abs(browser[i] - rendered[i]);
  expect(total / browser.length).toBeLessThan(3);
});
