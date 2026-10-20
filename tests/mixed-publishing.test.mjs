import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import {
  renderSubmission,
  assetVerified,
  textNeedsReview,
} from "../lib/server/render-submission.ts";
import { withdrawImage } from "../lib/server/review.ts";
import { savedBackgrounds } from "../lib/backgrounds.ts";
import assets from "../data/assets.json" with { type: "json" };
import { restoreScene, serializeScene } from "../lib/scene.ts";
const background = savedBackgrounds.find(
  (bg) => bg.name === "Alpine Mirror Lake",
);
const raw = (items = [], baseBg = background) =>
  JSON.stringify({ version: 2, baseBg, items });
test("server renders verified landscapes and never accepts an arbitrary background URL", async () => {
  const image = await renderSubmission(raw());
  const metadata = await sharp(image.png).metadata();
  assert.equal(image.verified, true);
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 800);
  const thumbnail = await sharp(image.thumbnail).metadata();
  assert.equal(thumbnail.width, 480);
  await assert.rejects(
    renderSubmission(raw([], { src: "https://attacker.example/image.svg" })),
    (error) => error.status === 400,
  );
  await assert.rejects(
    renderSubmission(raw(Array(61).fill({}))),
    (error) => error.status === 400,
  );
  const bytes = await readFile("public" + background.src);
  assert.equal(assetVerified(background.src, bytes), true);
  assert.equal(
    assetVerified(background.src, Buffer.concat([bytes, Buffer.from(" ")])),
    false,
  );
});
test("catalog elements are rendered by ID and unverified imports wait for review", async () => {
  const item = {
    assetId: assets.find((x) => x.type === "tree").id,
    uid: "test",
    x: 30,
    y: 40,
    scale: 0.5,
    rotation: 15,
    z: 1,
    flipX: true,
    flipY: false,
    opacity: 0.8,
    hue: 50,
  };
  const result = await renderSubmission(raw([item]));
  assert.equal(result.verified, false);
  const restored = restoreScene(result.editableScene, assets, savedBackgrounds);
  assert.equal(restored.items[0].rotation, 15);
  assert.equal(restored.items[0].flipX, true);
  assert.equal(serializeScene(restored), result.editableScene);
  await assert.rejects(
    renderSubmission(
      raw([{ ...item, assetId: "https://attacker.example/a.svg" }]),
    ),
    (error) => error.status === 400,
  );
  await assert.rejects(
    renderSubmission(raw([{ ...item, rotation: "malicious" }])),
    (error) => error.status === 400,
  );
});
test("suspicious text goes to review without blocking ordinary descriptions", () => {
  for (const text of [
    "Visit https://example.com",
    "buy now",
    "hello@example.com",
    "<script>",
    "casino",
    "xxxxxxxxxx",
  ])
    assert.equal(textNeedsReview(text, ""), true);
  assert.equal(
    textNeedsReview("A quiet valley", "Sunshine over the mountain lake."),
    false,
  );
});
test("owner withdrawal hides an image even when object removal needs recovery", async () => {
  let row = {
    id: "test",
    status: "published",
    public_image_key: "images/a/image.png",
    public_thumbnail_key: "images/a/thumbnail.webp",
  };
  let marked = false;
  const deps = {
    get: async () => row,
    mark: async () => {
      marked = true;
    },
    transition: async (id, status, patch) => {
      assert.equal(status, "published");
      row = { ...row, ...patch };
      return true;
    },
    remove: async () => {
      throw new Error("Network");
    },
    unmark: async () => {
      marked = false;
    },
  };
  const result = await withdrawImage("test", deps);
  assert.equal(result.cleanupPending, true);
  assert.equal(row.status, "rejected");
  assert.equal(row.public_image_key, null);
  assert.equal(marked, true);
});
test("reporting migration restricts access, deduplicates reports, respects quotas and never unpublishes automatically", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;",
    );
    for (const name of [
      "001_images.sql",
      "002_submission_limits.sql",
      "003_image_reports.sql",
      "003_image_reports.sql",
    ])
      await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from public.image_reports"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.report_image('scene','spam',$1)", [
        "a".repeat(64),
      ]),
      /permission denied/,
    );
    await db.exec("reset role");
    for (let i = 0; i < 7; i++)
      await db.query(
        "insert into public.images(slug,title,management_token_hash,private_object_prefix,sharing_consent_at,status,public_image_key,public_thumbnail_key,image_bytes,image_width,image_height,license_code,published_at) values($1,'Test Scene',$2,$1,now(),'published',$3,$4,100,1200,800,'download-only',now())",
        ["test-" + i, String(i).repeat(64), "public-" + i, "thumb-" + i],
      );
    await db.exec("set role service_role");
    const report = async (slug, actor = "a".repeat(64)) =>
      (
        await db.query("select public.report_image($1,$2,$3) as result", [
          slug,
          "spam",
          actor,
        ])
      ).rows[0].result;
    for (let i = 0; i < 5; i++)
      assert.equal(await report("test-" + i), "received");
    assert.equal(await report("test-0"), "received");
    assert.equal(await report("test-5"), "limited");
    assert.equal(await report("not-present", "b".repeat(64)), "not_found");
    const reports = await db.query("select * from public.image_reports");
    assert.equal(reports.rows.length, 5);
    await db.query("update public.image_reports set resolved_at=now()");
    assert.equal(await report("test-0"), "received");
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from public.image_reports where resolved_at is null",
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from public.images where status='published'",
        )
      ).rows[0].n,
      7,
    );
  } finally {
    await db.close();
  }
});

test("imported Illustrator artwork renders for review without editor-only foreign objects", async () => {
  for (const id of [
    "freeimage-chlopaya-bird",
    "freeimage-dachshund",
    "freeimage-rooster",
    "freeimage-sitting-brown-dog",
    "freeimage-slender-palm",
  ]) {
    const asset = assets.find((entry) => entry.id === id);
    assert.ok(asset, id);
    const result = await renderSubmission(
      raw([
        {
          assetId: id,
          uid: id,
          x: 30,
          y: 40,
          scale: 0.5,
          rotation: 0,
          z: 1,
          flipX: false,
          flipY: false,
          opacity: 1,
          hue: 0,
        },
      ]),
    );
    assert.equal(result.verified, false);
    assert.equal((await sharp(result.png).metadata()).width, 1200);
  }
});

test("unsupported artwork errors identify the element to replace", async () => {
  await assert.rejects(
    renderSubmission(
      raw([
        {
          assetId: "freeimage-sleeping-tabby-cat",
          uid: "cat",
          x: 30,
          y: 40,
          scale: 0.5,
          rotation: 0,
          z: 1,
          flipX: false,
          flipY: false,
          opacity: 1,
          hue: 0,
        },
      ]),
    ),
    (error) =>
      error.status === 400 && error.message.includes("sleeping tabby cat"),
  );
});

test("custom text renders safely for review and invalid photos cannot publish", async () => {
  const image = await renderSubmission(
    raw([
      {
        assetId: "custom-text",
        text: { content: "<hello> & village", color: "#123456", bold: true },
        uid: "caption",
        x: 20,
        y: 20,
        scale: 1,
        rotation: 0,
        opacity: 1,
        hue: 0,
        z: 1,
      },
    ]),
  );
  assert.equal(image.verified, false);
  assert.equal((await sharp(image.png).metadata()).width, 1200);
  assert.equal(
    restoreScene(image.editableScene, assets, savedBackgrounds).items[0].asset
      .text.content,
    "<hello> & village",
  );
  await assert.rejects(
    renderSubmission(
      raw([], { photo: true, src: "data:image/jpeg;base64,YWJj" }),
    ),
    (error) => error.status === 400,
  );
});

test("photo scenes render privately for review and keep an editable metadata-free copy", async () => {
  const jpeg = await sharp({
    create: { width: 500, height: 700, channels: 3, background: "#905040" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const photo = {
    photo: true,
    src: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
    crop: { zoom: 1.4, x: 30, y: 60 },
    adjustments: { brightness: 1.2, contrast: 1.1, saturation: 0.5 },
  };
  const png = await sharp({
    create: {
      width: 60,
      height: 80,
      channels: 4,
      background: { r: 0, g: 200, b: 100, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
  const items = [
    {
      assetId: "uploaded-photo",
      photo: `data:image/png;base64,${png.toString("base64")}`,
      uid: "photo",
      x: 20,
      y: 30,
      scale: 1,
      rotation: 15,
      opacity: 0.8,
      hue: 0,
      z: 1,
    },
  ];
  const result = await renderSubmission(raw(items, photo));
  assert.equal(result.verified, false);
  const restored = restoreScene(result.editableScene, assets, savedBackgrounds);
  assert.equal(restored.baseBg.photo, true);
  assert.deepEqual(restored.baseBg.crop, {
    ...photo.crop,
    rotation: 0,
    flipX: false,
    flipY: false,
  });
  assert.deepEqual(restored.baseBg.adjustments, photo.adjustments);
  const metadata = await sharp(
    Buffer.from(restored.baseBg.src.split(",")[1], "base64"),
  ).metadata();
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(
    (
      await sharp(
        Buffer.from(restored.items[0].asset.src.split(",")[1], "base64"),
      ).metadata()
    ).hasAlpha,
    true,
  );
  await renderSubmission(result.editableScene);
  const spoofed = {
    ...photo,
    src: `data:image/jpeg;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>').toString("base64")}`,
  };
  await assert.rejects(
    renderSubmission(raw([], spoofed)),
    (error) => error.status === 400,
  );
});

test("photo migration preserves existing scenes and bounds editable project bytes", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create schema if not exists public; create table public.images (editable_scene text constraint images_editable_scene_check check (octet_length(editable_scene) <= 200000)); insert into public.images values ('old scene');",
    );
    const sql = await readFile(
      "supabase/migrations/007_photo_scenes.sql",
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    await db.query("insert into public.images values ($1)", [
      "x".repeat(200001),
    ]);
    assert.equal(
      (await db.query("select editable_scene from public.images limit 1"))
        .rows[0].editable_scene,
      "old scene",
    );
    await assert.rejects(
      db.query("insert into public.images values ($1)", ["x".repeat(3145729)]),
    );
  } finally {
    await db.close();
  }
});

test("publishing renders every canvas preset at its declared dimensions", async () => {
  for (const [size, width, height] of [
    ["square", 1080, 1080],
    ["portrait", 1080, 1350],
    ["wallpaper", 1080, 1920],
  ]) {
    const result = await renderSubmission(
      JSON.stringify({ ...JSON.parse(raw()), size }),
    );
    const metadata = await sharp(result.png).metadata();
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, height);
    assert.equal(result.width, width);
    assert.equal(result.height, height);
    assert.equal(JSON.parse(result.editableScene).size, size);
    const thumb = await sharp(result.thumbnail).metadata();
    assert.ok(Math.abs(thumb.width / thumb.height - width / height) < 0.01);
  }
});

test("simple backdrops render for review and remain editable", async () => {
  const simple = savedBackgrounds.filter((bg) =>
    bg.src?.includes("/simple-backgrounds/"),
  );
  assert.equal(simple.length, 36);
  for (const bg of simple.filter((_, index) => index % 6 === 0)) {
    const result = await renderSubmission(raw([], bg));
    assert.equal(result.verified, false);
    assert.equal((await sharp(result.png).metadata()).width, 1200);
    assert.equal(
      restoreScene(result.editableScene, assets, savedBackgrounds).baseBg.src,
      bg.src,
    );
  }
});
