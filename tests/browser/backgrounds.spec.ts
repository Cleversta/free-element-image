import { test, expect } from "@playwright/test";

test("backgrounds can be filtered, searched, saved and undone", async ({page}) => {
  await page.goto('/create');
  const choices = page.locator('.visualBgGrid button');
  await expect(choices).toHaveCount(54);
  await page.getByLabel('Background category', {exact:true}).selectOption('Skies');
  await expect(choices).toHaveCount(12);
  await page.getByLabel('Search backgrounds', {exact:true}).fill('Twilight');
  await expect(choices).toHaveCount(2);
  await choices.filter({hasText:'Twilight open sky'}).click();
  await expect(page.locator('.sceneBackground')).toHaveAttribute('src', /twilight-clouds/);
  await page.getByTitle('Undo', {exact:true}).click();
  await expect(page.locator('.sceneBackground')).toHaveAttribute('src', /alpine-mirror-lake/);
  await page.getByTitle('Redo', {exact:true}).click();
  await expect(page.getByText('All changes saved', {exact:true})).toBeVisible();
  await page.reload();
  await expect(page.locator('.sceneBackground')).toHaveAttribute('src', /twilight-clouds/);
  await page.getByLabel('Search backgrounds', {exact:true}).fill('no matching background');
  await expect(choices).toHaveCount(0);
  await expect(page.getByText('No backgrounds match.', {exact:false})).toBeVisible();
});
