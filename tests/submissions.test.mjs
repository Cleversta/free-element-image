import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  submit,
  manage,
  readBody,
  tokenHash,
  normalizePng,
  actorHash,
  submissionFailure,
} from "../lib/server/submissions.ts";
import { isNetlifyEnvironment, verifyChallenge } from "../lib/server/submission-services.ts";
const token = "a".repeat(64);
const png = (
  await sharp({
    create: { width: 1200, height: 800, channels: 3, background: "#abc" },
  })
    .png()
    .toBuffer()
).toString("base64");
const body = {
  managementToken: token,
  title: "A quiet meadow",
  description: "My scene",
  consent: true,
  challenge: "verified",
  scene: "test-scene",
};
function request(data = body, origin = "https://example.com") {
  return new Request("https://example.com/api/publish", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-nf-client-connection-ip": "192.0.2.1",
    },
    body: JSON.stringify(data),
  });
}
function fixture(overrides = {}) {
  let row = null;
  const objects = new Map();
  let reserved = 0;
  const deps = {
    siteUrl: "https://example.com",
    hashKey: "test-only",
    netlify: true,
    development: false,
    verify: async () => true,
    render: async () => ({
      png: Buffer.from(png, "base64"),
      thumbnail: Buffer.from("test"),
      verified: false,
    }),
    textNeedsReview: () => false,
    autoPublish: async () => {
      throw new Error("Manual mode");
    },
    find: async (hash) =>
      row?.management_token_hash === hash ? { ...row } : null,
    reserve: async () => {
      reserved++;
      return true;
    },
    insert: async (value) => {
      row = {
        status: "uploading",
        created_at: new Date().toISOString(),
        ...value,
      };
    },
    transition: async (id, from, patch) => {
      if (row.id !== id || !from.includes(row.status)) return false;
      Object.assign(row, patch);
      return true;
    },
    put: async (key, bytes) => {
      objects.set(key, bytes);
    },
    remove: async (key) => {
      objects.delete(key);
    },
    ...overrides,
  };
  return { deps, objects, row: () => row, reserved: () => reserved };
}
test("submission uploads normalized private images, hashes tokens, retries once and removes files", async () => {
  const f = fixture();
  const result = await submit(request(), f.deps);
  assert.equal(result.status, "pending");
  assert.equal(f.row().category, "nature");
  assert.equal(f.objects.size, 2);
  assert.equal(f.row().management_token_hash, tokenHash(token));
  assert.ok(!JSON.stringify(f.row()).includes(token));
  assert.equal(f.row().license_code, undefined);
  assert.deepEqual(await submit(request(), f.deps), result);
  assert.equal(f.reserved(), 0);
  const status = await manage(
    request({ managementToken: token, action: "status" }),
    f.deps,
  );
  assert.deepEqual(Object.keys(status).sort(), [
    "createdAt",
    "id",
    "status",
    "title",
  ]);
  await assert.rejects(
    manage(
      request({ managementToken: "b".repeat(64), action: "delete" }),
      f.deps,
    ),
    (error) => error.status === 404,
  );
  assert.equal(f.objects.size, 2);
  assert.equal(
    (
      await manage(
        request({ managementToken: token, action: "delete" }),
        f.deps,
      )
    ).status,
    "deleted",
  );
  assert.equal(f.objects.size, 0);
  assert.equal(
    (
      await manage(
        request({ managementToken: token, action: "delete" }),
        f.deps,
      )
    ).status,
    "deleted",
  );
});
test("origin, consent, verification, quotas and trusted host checks fail before storage", async () => {
  for (const [data, origin, overrides, expected] of [
    [body, "https://attacker.example", {}, 403],
    [{ ...body, consent: false }, undefined, {}, 400],
    [{ ...body, category: "invalid" }, undefined, {}, 400],
    [body, undefined, { verify: async () => false }, 403],
    [body, undefined, { netlify: false }, 503],
  ]) {
    const f = fixture(overrides);
    await assert.rejects(
      submit(request(data, origin), f.deps),
      (error) => error.status === expected,
    );
    assert.equal(f.objects.size, 0);
    assert.equal(f.row(), null);
  }
  const f = fixture();
  const noTrustedIP = request();
  noTrustedIP.headers.delete("x-nf-client-connection-ip");
  noTrustedIP.headers.set("x-forwarded-for", "192.0.2.1");
  assert.throws(
    () => actorHash(noTrustedIP, f.deps),
    (error) => error.status === 503,
  );
});
test("body and image validation reject oversize input, spoofed PNG and wrong dimensions", async () => {
  await assert.rejects(
    readBody(request({ a: "x".repeat(100) }), 20),
    (error) => error.status === 413,
  );
  await assert.rejects(
    normalizePng(Buffer.from("<svg></svg>").toString("base64")),
    (error) => error.status === 400,
  );
  const small = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    normalizePng(small.toString("base64")),
    (error) => error.status === 400,
  );
});
test("failed uploads clean up, while a lost success response preserves completed images", async () => {
  const f = fixture();
  const originalPut = f.deps.put;
  f.deps.put = async (key, bytes) => {
    if (key.endsWith(".webp")) throw new Error("Network failed");
    await originalPut(key, bytes);
  };
  await assert.rejects(
    submit(request(), f.deps),
    (error) => error.status === 503,
  );
  assert.equal(f.objects.size, 0);
  assert.equal(f.row().status, "rejected");
  const success = fixture();
  const transition = success.deps.transition;
  success.deps.transition = async (...args) => {
    await transition(...args);
    throw new Error("Response lost");
  };
  assert.equal((await submit(request(), success.deps)).status, "pending");
  assert.equal(success.objects.size, 2);
});
test("failed removal can be retried using the same private link", async () => {
  const f = fixture();
  await submit(request(), f.deps);
  const remove = f.deps.remove;
  f.deps.remove = async () => {
    throw new Error("Network failed");
  };
  await assert.rejects(
    manage(request({ managementToken: token, action: "delete" }), f.deps),
  );
  assert.equal(f.row().status, "deleting");
  f.deps.remove = remove;
  assert.equal(
    (
      await manage(
        request({ managementToken: token, action: "delete" }),
        f.deps,
      )
    ).status,
    "deleted",
  );
  assert.equal(f.objects.size, 0);
});
test("Turnstile requires successful verification with the expected hostname and action", async () => {
  for (const [payload, expected] of [
    [{ success: true, hostname: "example.com", action: "publish" }, true],
    [{ success: true, hostname: "elsewhere.com", action: "publish" }, false],
    [{ success: true, hostname: "example.com", action: "login" }, false],
    [{ success: false, hostname: "example.com", action: "publish" }, false],
  ])
    assert.equal(
      await verifyChallenge("token", "secret", "example.com", async () =>
        Response.json(payload),
      ),
      expected,
    );
  const response = submissionFailure(new Error("secret credentials"));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(!(await response.text()).includes("secret credentials"));
});
test("persistent submission limits enforce both quotas and deny browser access", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/002_submission_limits.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const dailyMigration = await readFile(
      new URL(
        "../supabase/migrations/005_daily_submission_limit.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(dailyMigration);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query("select public.reserve_submission($1)", [token]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select * from public.submission_limits"),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    // A partial deployment can be repaired without deleting existing quota rows.
    await db.exec(
      "insert into public.submission_limits values ('repair-test', now(), 3)",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/002_submission_limits.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query(
          "select attempts from public.submission_limits where scope='repair-test'",
        )
      ).rows[0].attempts,
      3,
    );
    await db.exec(dailyMigration);
    await db.exec("set role service_role");
    await assert.rejects(
      db.query("select public.reserve_submission($1)", [
        "invalid-readiness-probe",
      ]),
      (error) => error.code === "P0001" && error.message === "Invalid actor",
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int as count from public.submission_limits",
        )
      ).rows[0].count,
      1,
    );
    for (let i = 0; i < 1; i++)
      assert.equal(
        (
          await db.query("select public.reserve_submission($1) as allowed", [
            token,
          ])
        ).rows[0].allowed,
        true,
      );
    assert.equal(
      (
        await db.query("select public.reserve_submission($1) as allowed", [
          token,
        ])
      ).rows[0].allowed,
      false,
    );
    for (let i = 0; i < 99; i++)
      assert.equal(
        (
          await db.query("select public.reserve_submission($1) as allowed", [
            i.toString(16).padStart(64, "0"),
          ])
        ).rows[0].allowed,
        true,
      );
    assert.equal(
      (
        await db.query("select public.reserve_submission($1) as allowed", [
          "b".repeat(64),
        ])
      ).rows[0].allowed,
      false,
    );
  } finally {
    await db.close();
  }
});

test("submissions ignore quotas and automatic publication and always wait for review", async () => {
  const f = fixture({
    reserve: async () => {
      throw new Error("Quota must not be called");
    },
    autoPublish: async () => {
      throw new Error("Automatic publication must not be called");
    },
  });
  assert.equal((await submit(request(), f.deps)).status, "pending");
  assert.equal(f.row().status, "pending");
});

test("chosen category is retained for manual review", async () => {
  const f = fixture();
  await submit(request({ ...body, category: "beach" }), f.deps);
  assert.equal(f.row().category, "beach");
  assert.equal(f.row().status, "pending");
});


test("Netlify Functions are recognized without the build-only NETLIFY flag", () => {
  assert.equal(isNetlifyEnvironment({}), false);
  assert.equal(isNetlifyEnvironment({ NETLIFY: "false" }), false);
  assert.equal(isNetlifyEnvironment({ NETLIFY: "true" }), true);
  assert.equal(isNetlifyEnvironment({ URL: "https://freelementimages.site" }), false);
  const runtime = {
    SITE_ID: "netlify-site-id",
    SITE_NAME: "freelement-images",
    URL: "https://freelementimages.site",
  };
  assert.equal(isNetlifyEnvironment(runtime), true);
  const f = fixture({ netlify: isNetlifyEnvironment(runtime) });
  assert.match(actorHash(request(), f.deps), /^[a-f0-9]{64}$/);
  for (const value of ["", "not-an-ip", "192.0.2.1, 192.0.2.2"]) {
    const invalid = request();
    invalid.headers.set("x-nf-client-connection-ip", value);
    assert.throws(() => actorHash(invalid, f.deps), (error) => error.status === 503);
  }
});
