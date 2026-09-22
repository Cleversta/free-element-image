import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { readSupabaseConfig, readR2Config } from "../lib/server/config.ts";

const r2Env = {
  R2_ACCOUNT_ID: "a".repeat(32),
  R2_ACCESS_KEY_ID: "example",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_PRIVATE_BUCKET: "private-images",
  R2_PUBLIC_BUCKET: "public-images",
};
test("backend configuration rejects missing or unsafe credentials without exposing values", () => {
  assert.throws(() => readSupabaseConfig({}), /Missing SUPABASE_URL/);
  assert.throws(
    () =>
      readSupabaseConfig({
        SUPABASE_URL: "https://example.com",
        SUPABASE_SECRET_KEY: "sb_publishable_example",
      }),
    /backend secret key/,
  );
  assert.throws(
    () =>
      readSupabaseConfig({ SUPABASE_URL: "https://user:secret@example.com" }),
    (error) =>
      !error.message.includes("user:secret") &&
      /HTTPS origin/.test(error.message),
  );
  assert.deepEqual(
    readSupabaseConfig({
      SUPABASE_URL: "https://example.com/",
      SUPABASE_SECRET_KEY: "sb_secret_example",
    }),
    { url: "https://example.com", secretKey: "sb_secret_example" },
  );
});
test("R2 keeps private and public storage separate and permits setup without a public domain", () => {
  assert.equal(readR2Config(r2Env).publicBaseUrl, undefined);
  assert.throws(
    () => readR2Config({ ...r2Env, R2_PUBLIC_BUCKET: r2Env.R2_PRIVATE_BUCKET }),
    /different R2 buckets/,
  );
  assert.throws(
    () => readR2Config({ ...r2Env, R2_ACCOUNT_ID: "bad" }),
    /account ID/,
  );
  assert.throws(
    () => readR2Config({ ...r2Env, R2_PUBLIC_BASE_URL: "http://example.com" }),
    /HTTPS origin/,
  );
});
test("database migration blocks browser access and incomplete publication", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role;",
    );
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/001_images.sql", import.meta.url),
        "utf8",
      ),
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query("select * from public.images"),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    await db.query(
      "insert into public.images (slug,title,management_token_hash,private_object_prefix,sharing_consent_at) values ($1,$2,$3,$4,now())",
      ["test-scene", "Test Scene", "a".repeat(64), "test-prefix"],
    );
    assert.equal(
      (await db.query("select status from public.images")).rows[0].status,
      "uploading",
    );
    await assert.rejects(
      db.query("update public.images set status='published'"),
      /publication_requires_complete_image/,
    );
    await assert.rejects(
      db.query("update public.images set status='deleted'"),
      /deleted_image_has_timestamp/,
    );
    await assert.rejects(
      db.query("update public.images set image_bytes=10485761"),
      /check constraint/,
    );
    await db.query(
      "update public.images set status='published', public_image_key='image.png', public_thumbnail_key='thumb.webp', image_bytes=100, image_width=1200, image_height=800, license_code='test-license', published_at=now(), updated_at='2000-01-01'",
    );
    const row = (await db.query("select status, updated_at from public.images"))
      .rows[0];
    assert.equal(row.status, "published");
    assert.ok(new Date(row.updated_at).getFullYear() > 2000);
  } finally {
    await db.close();
  }
});
