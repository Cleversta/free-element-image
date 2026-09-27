import { adsTxt } from "../lib/ads.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { structuredData } from "../lib/structured-data.ts";
import { galleryMetadata, pageMetadata } from "../lib/seo.ts";
import { mainSitemap, sitemapIndex, urlset } from "../lib/sitemaps.ts";
import { imageCacheControl } from "../lib/image-cache.ts";
import { restoreScene } from "../lib/scene.ts";
import { starterScenes } from "../lib/starter-scenes.ts";
import { savedBackgrounds } from "../lib/backgrounds.ts";
import assets from "../data/assets.json" with { type: "json" };
import blocked from "../data/publishing-compatibility.json" with { type: "json" };

test("structured data preserves text without permitting a closing script tag", () => {
  const input = {
    name: '</script><script>alert("x")</script>',
    description: "< & >",
  };
  const output = structuredData(input);
  assert.equal(output.includes("<"), false);
  assert.deepEqual(JSON.parse(output), input);
});
test("SEO keeps distinct page and pagination canonicals and excludes internal searches", () => {
  assert.equal(
    pageMetadata("About", "About us", "/about").alternates.canonical,
    "/about",
  );
  assert.equal(
    galleryMetadata(2, "", "").alternates.canonical,
    "/gallery?page=2",
  );
  assert.equal(galleryMetadata(2, "", "").robots.index, true);
  const filtered = galleryMetadata(1, "lake & trees", "nature");
  assert.equal(filtered.robots.index, false);
  assert.equal(
    new URL(
      filtered.alternates.canonical,
      "https://test.invalid",
    ).searchParams.get("q"),
    "lake & trees",
  );
});
test("sitemaps include starter scenes and guides and do not truncate at 1,000 images", () => {
  const index = sitemapIndex(2001);
  assert.match(index, /\/images\/2.xml/);
  assert.doesNotMatch(index, /\/images\/3.xml/);
  assert.match(sitemapIndex(0), /main.xml/);
  const xml = mainSitemap();
  assert.match(xml, /\/guides\/your-first-landscape/);
  assert.match(xml, /\/scenes\/alpine-mirror-lake/);
  assert.doesNotMatch(xml, /\/manage|\/admin/);
  assert.match(urlset([{ path: "/a?x=1&y=2", modified: "invalid" }]), /&amp;/);
  assert.doesNotMatch(urlset([{ path: "/a", modified: "invalid" }]), /lastmod/);
});
test("only thumbnails have a bounded private cache", () => {
  assert.equal(imageCacheControl("image"), "no-store");
  assert.equal(imageCacheControl("download"), "no-store");
  assert.equal(
    imageCacheControl("thumbnail"),
    "private, max-age=60, must-revalidate",
  );
});
test("every starter is editable, and client publication warnings match the server limits", async () => {
  for (const starter of starterScenes) {
    const restored = restoreScene(
      JSON.stringify({ version: 2, baseBg: starter.background, items: [] }),
      assets,
      savedBackgrounds,
    );
    assert.equal(restored.baseBg.src, starter.background.src);
  }
  for (const asset of assets) {
    const bytes = await readFile(`public${asset.src}`);
    const incompatible =
      bytes.length > 2000000 ||
      /<script|<foreignObject|<!ENTITY|(?:href\s*=\s*["']\s*(?!#)[^"']+)|url\(\s*["']?(?!#)/i.test(
        bytes.toString(),
      );
    assert.equal(asset.src in blocked, incompatible, asset.src);
  }
});
test("persistent launch limits bound retries, survive migration reruns, and deny browser roles", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role;",
    );
    for (const file of [
      "002_submission_limits.sql",
      "005_daily_submission_limit.sql",
      "006_launch_limits.sql",
    ]) {
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    }
    const actor = "a".repeat(64),
      token = "b".repeat(64);
    const reserve = async (who = actor, receipt = token) =>
      (
        await db.query(
          "select public.reserve_submission_attempt($1,$2) as allowed",
          [who, receipt],
        )
      ).rows[0].allowed;
    assert.equal(await reserve(), true);
    assert.equal(await reserve(), true);
    assert.equal(await reserve(), true);
    assert.equal(await reserve(), false);
    assert.equal(await reserve(actor, "c".repeat(64)), false);
    assert.equal(
      (
        await db.query(
          "select attempts from public.submission_limits where scope = 'all'",
        )
      ).rows[0].attempts,
      1,
    );
    await db.exec(
      await readFile("supabase/migrations/006_launch_limits.sql", "utf8"),
    );
    assert.equal(await reserve(), false);
    assert.equal(await reserve("d".repeat(64)), true);
    await assert.rejects(reserve("bad"));
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await db.query("select public.reserve_owner_login($1) as allowed", [
            actor,
          ])
        ).rows[0].allowed,
        true,
      );
    assert.equal(
      (
        await db.query("select public.reserve_owner_login($1) as allowed", [
          actor,
        ])
      ).rows[0].allowed,
      false,
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(reserve());
      await assert.rejects(
        db.query("select public.reserve_owner_login($1)", [actor]),
      );
      await assert.rejects(
        db.query("select * from public.submission_reservations"),
      );
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});

test("ads.txt stays absent until a real publisher ID is configured", () => {
  for (const value of [
    undefined,
    "",
    "pub-example",
    "pub-1234567890123456\nextra",
  ])
    assert.equal(adsTxt(value), null);
  assert.equal(
    adsTxt("pub-1234567890123456"),
    "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
  );
});
