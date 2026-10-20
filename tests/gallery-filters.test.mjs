import test from "node:test";
import assert from "node:assert/strict";
import {
  galleryFilters,
  galleryPageHref,
  gallerySort,
} from "../lib/gallery-filters.ts";
test("gallery normalizes untrusted filters and preserves punctuation in pagination", () => {
  assert.deepEqual(galleryFilters(["invalid"], "private"), {
    q: "",
    category: "",
  });
  assert.equal(galleryFilters("x".repeat(150), "forest").q.length, 100);
  const url = new URL(
    galleryPageHref(2, "sunset & 100%", "forest"),
    "https://example.com",
  );
  assert.equal(url.searchParams.get("q"), "sunset & 100%");
  assert.equal(url.searchParams.get("category"), "forest");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(galleryPageHref(1, "", ""), "/gallery");
});
test("gallery sorting defaults safely and survives filtered pagination", () => {
  assert.equal(gallerySort("oldest"), "oldest");
  assert.equal(gallerySort(["oldest"]), "newest");
  assert.equal(gallerySort("invalid"), "newest");
  const url = new URL(
    galleryPageHref(3, "lake", "nature", "oldest"),
    "https://example.com",
  );
  assert.equal(url.searchParams.get("sort"), "oldest");
  assert.equal(url.searchParams.get("page"), "3");
  assert.equal(url.searchParams.get("q"), "lake");
  assert.equal(url.searchParams.get("category"), "nature");
});
