import test from "node:test";
import assert from "node:assert/strict";
import {
  approveImage,
  rejectImage,
  recoverPublication,
} from "../lib/server/review.ts";
import {
  ownerSession,
  validOwnerSession,
  equalSecret,
  requireOwner,
  loginCookie,
} from "../lib/server/owner.ts";
const id = "11111111-1111-4111-8111-111111111111";
function fixture() {
  let row = {
    id,
    slug: `scene-${id}`,
    title: "A scene",
    status: "pending",
    image_bytes: 100,
    image_width: 1200,
    image_height: 800,
    private_object_prefix: `submissions/${id}`,
  };
  const objects = new Set();
  const jobs = new Map();
  const deps = {
    get: async () => (row ? { ...row } : null),
    transition: async (_, from, patch) => {
      if (row?.status !== from) return false;
      Object.assign(row, patch);
      return true;
    },
    mark: async (job) => jobs.set(job.markerKey, job),
    unmark: async (key) => jobs.delete(key),
    copy: async (_, key) => objects.add(key),
    remove: async (key) => objects.delete(key),
  };
  return {
    deps,
    objects,
    jobs,
    row: () => row,
    erase: () => {
      row = null;
    },
  };
}
test("owner sessions reject invalid keys, tampering, expiration and missing cookies", () => {
  const key = "test-pass";
  const now = 1800000000000;
  const value = ownerSession(key, now);
  assert.equal(validOwnerSession(value, key, now), true);
  assert.equal(validOwnerSession(value, "b".repeat(64), now), false);
  assert.equal(validOwnerSession(value, key, now + 9 * 3600000), false);
  assert.equal(validOwnerSession(value + "x", key, now), false);
  assert.equal(equalSecret("x", "xx"), false);
  const original = process.env.ADMIN_ACCESS_KEY;
  process.env.ADMIN_ACCESS_KEY = key;
  try {
    assert.throws(
      () => requireOwner(new Request("http://localhost/admin")),
      (error) => error.status === 401,
    );
    assert.throws(
      () => loginCookie("bad"),
      (error) => error.status === 401,
    );
    const cookie = loginCookie(key);
    assert.ok(cookie.includes("HttpOnly"));
    assert.ok(cookie.includes("SameSite=Strict"));
    assert.doesNotThrow(() =>
      requireOwner(
        new Request("http://localhost/admin", { headers: { cookie } }),
      ),
    );
  } finally {
    if (original === undefined) delete process.env.ADMIN_ACCESS_KEY;
    else process.env.ADMIN_ACCESS_KEY = original;
  }
});
test("approval requires source confirmation, copies both images, then publishes once", async () => {
  const f = fixture();
  await assert.rejects(
    approveImage(id, false, f.deps),
    (e) => e.status === 400,
  );
  assert.equal(f.objects.size, 0);
  assert.equal((await approveImage(id, true, f.deps)).status, "published");
  assert.equal(f.objects.size, 2);
  assert.equal(f.jobs.size, 0);
  assert.equal(f.row().license_code, "download-only");
  assert.equal((await approveImage(id, true, f.deps)).status, "published");
  assert.equal(f.objects.size, 2);
});
test("rejection never copies images or grants public access", async () => {
  const f = fixture();
  await rejectImage(id, f.deps);
  assert.equal(f.row().status, "rejected");
  assert.equal(f.objects.size, 0);
  await assert.rejects(approveImage(id, true, f.deps), (e) => e.status === 409);
});
test("copy failure cleans partial publication and leaves submission pending", async () => {
  const f = fixture();
  const copy = f.deps.copy;
  f.deps.copy = async (source, key) => {
    if (key.endsWith("webp")) throw new Error("Storage unavailable");
    await copy(source, key);
  };
  await assert.rejects(approveImage(id, true, f.deps));
  assert.equal(f.row().status, "pending");
  assert.equal(f.objects.size, 0);
  assert.equal(f.jobs.size, 0);
});
test("deletion winning the race prevents publication and removes public copies", async () => {
  const f = fixture();
  f.deps.transition = async () => {
    f.row().status = "deleted";
    return false;
  };
  await assert.rejects(approveImage(id, true, f.deps), (e) => e.status === 409);
  assert.equal(f.row().status, "deleted");
  assert.equal(f.objects.size, 0);
});
test("concurrent approvals use distinct object keys and keep only the winner", async () => {
  const f = fixture();
  const result = await Promise.allSettled([
    approveImage(id, true, f.deps),
    approveImage(id, true, f.deps),
  ]);
  assert.equal(result.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(f.objects.size, 2);
  assert.ok(f.objects.has(f.row().public_image_key));
  assert.equal(f.jobs.size, 0);
});
test("lost commit response preserves published files", async () => {
  const f = fixture();
  const transition = f.deps.transition;
  f.deps.transition = async (...args) => {
    await transition(...args);
    throw new Error("Response lost");
  };
  assert.equal((await approveImage(id, true, f.deps)).status, "published");
  assert.equal(f.objects.size, 2);
});
test("uncertain database state leaves a durable recovery job; cleanup skips recent attempts", async () => {
  const f = fixture();
  let reads = 0;
  const get = f.deps.get;
  f.deps.get = async () => {
    if (reads++ > 0) throw new Error("Database unavailable");
    return get();
  };
  f.deps.transition = async () => {
    throw new Error("Database unavailable");
  };
  await assert.rejects(approveImage(id, true, f.deps));
  assert.equal(f.jobs.size, 1);
  assert.equal(f.objects.size, 2);
  f.deps.get = get;
  const job = [...f.jobs.values()][0];
  assert.equal(
    await recoverPublication(job, f.deps, job.createdAt + 1000),
    false,
  );
  assert.equal(
    await recoverPublication(job, f.deps, job.createdAt + 3600001),
    true,
  );
  assert.equal(f.objects.size, 0);
  assert.equal(f.jobs.size, 0);
});
test("recovery preserves files referenced by a published image", async () => {
  const f = fixture();
  f.deps.unmark = async () => {};
  await approveImage(id, true, f.deps);
  const job = [...f.jobs.values()][0];
  await recoverPublication(job, f.deps, job.createdAt + 3600001);
  assert.equal(f.objects.size, 2);
});
