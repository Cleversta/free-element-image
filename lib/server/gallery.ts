import "server-only";
import { createSupabaseAdmin, createR2Client } from "./clients.ts";
import { readR2Config } from "./config.ts";
import {
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { ReviewImage, ReviewDependencies } from "./review.ts";
import { SubmissionError } from "./submissions.ts";
const publicFields =
  "slug,title,description,license_code,image_width,image_height,published_at";
export type PublicImage = {
  slug: string;
  title: string;
  description: string;
  license_code: string;
  image_width: number;
  image_height: number;
  published_at: string;
};
export async function listPublished(page = 1, pageSize = 24) {
  const size = Math.max(1, Math.min(24, Math.floor(pageSize)));
  const db = createSupabaseAdmin();
  const { data, error } = await db
    .from("images")
    .select(publicFields)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id")
    .range((page - 1) * size, page * size);
  if (error) throw new Error("Gallery unavailable");
  return {
    images: (data || []).slice(0, size) as PublicImage[],
    more: (data || []).length > size,
  };
}
export async function publicImage(slug: string) {
  if (!/^scene-[a-f0-9-]{36}$/.test(slug)) return null;
  const { data, error } = await createSupabaseAdmin()
    .from("images")
    .select(publicFields)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Gallery unavailable");
  return data as PublicImage | null;
}
export function galleryServices() {
  const db = createSupabaseAdmin();
  const r2 = createR2Client();
  const cfg = readR2Config();
  const deps: ReviewDependencies = {
    async get(id) {
      const { data, error } = await db
        .from("images")
        .select(
          "id,slug,title,description,status,private_object_prefix,public_image_key,public_thumbnail_key,created_at,image_bytes,image_width,image_height",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error("Database unavailable");
      return data as ReviewImage | null;
    },
    async transition(id, from, patch) {
      const { data, error } = await db
        .from("images")
        .update(patch)
        .eq("id", id)
        .eq("status", from)
        .select("id");
      if (error) throw new Error("Database unavailable");
      return data.length === 1;
    },
    async mark(job) {
      await r2.send(
        new PutObjectCommand({
          Bucket: cfg.privateBucket,
          Key: job.markerKey,
          Body: JSON.stringify(job),
          ContentType: "application/json",
        }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
    },
    async unmark(key) {
      await r2.send(
        new DeleteObjectCommand({ Bucket: cfg.privateBucket, Key: key }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
    },
    async copy(source, target, contentType) {
      await r2.send(
        new CopyObjectCommand({
          Bucket: cfg.publicBucket,
          Key: target,
          CopySource: `${cfg.privateBucket}/${source.split("/").map(encodeURIComponent).join("/")}`,
          MetadataDirective: "REPLACE",
          ContentType: contentType,
          CacheControl: "no-store",
        }),
        { abortSignal: AbortSignal.timeout(20000) },
      );
    },
    async remove(key) {
      await r2.send(
        new DeleteObjectCommand({ Bucket: cfg.publicBucket, Key: key }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
    },
  };
  return { deps, close: () => r2.destroy() };
}
export async function imageBytes(key: string, isPublic: boolean) {
  const r2 = createR2Client();
  const config = readR2Config();
  try {
    const value = await r2.send(
      new GetObjectCommand({
        Bucket: isPublic ? config.publicBucket : config.privateBucket,
        Key: key,
      }),
      { abortSignal: AbortSignal.timeout(15000) },
    );
    if (
      !value.Body ||
      !value.ContentLength ||
      value.ContentLength > 10 * 1024 * 1024
    )
      throw new Error("Image unavailable");
    return await value.Body.transformToByteArray();
  } finally {
    r2.destroy();
  }
}
export async function publishedFile(slug: string, variant: string) {
  if (
    !/^scene-[a-f0-9-]{36}$/.test(slug) ||
    !["image", "thumbnail", "download"].includes(variant)
  )
    throw new SubmissionError(404, "Image not found.");
  const { data, error } = await createSupabaseAdmin()
    .from("images")
    .select("public_image_key,public_thumbnail_key")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Gallery unavailable");
  const key =
    variant === "thumbnail"
      ? data?.public_thumbnail_key
      : data?.public_image_key;
  if (!key) throw new SubmissionError(404, "Image not found.");
  const bytes = await imageBytes(key, true);
  // Recheck after storage access so an in-flight removal cannot reveal a pending image.
  if (!(await publicImage(slug)))
    throw new SubmissionError(404, "Image not found.");
  return bytes;
}
