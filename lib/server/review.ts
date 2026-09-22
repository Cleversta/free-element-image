import "server-only";
import { randomUUID } from "node:crypto";
import { SubmissionError } from "./submissions.ts";
export type ReviewImage = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  private_object_prefix: string;
  public_image_key: string | null;
  public_thumbnail_key: string | null;
  created_at: string;
  image_bytes: number | null;
  image_width: number | null;
  image_height: number | null;
};
export type PublicationJob = {
  id: string;
  imageKey: string;
  thumbnailKey: string;
  markerKey: string;
  createdAt: number;
};
export type ReviewDependencies = {
  get: (id: string) => Promise<ReviewImage | null>;
  transition: (
    id: string,
    from: string,
    patch: Record<string, unknown>,
  ) => Promise<boolean>;
  mark: (job: PublicationJob) => Promise<void>;
  unmark: (key: string) => Promise<void>;
  copy: (source: string, target: string, contentType: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};
export async function approveImage(
  id: string,
  rightsConfirmed: boolean,
  deps: ReviewDependencies,
) {
  if (!rightsConfirmed)
    throw new SubmissionError(
      400,
      "Confirm that the source artwork may be publicly displayed and downloaded.",
    );
  const row = await deps.get(id);
  if (!row) throw new SubmissionError(404, "Submission not found.");
  if (row.status === "published")
    return { status: "published", slug: row.slug };
  if (row.status !== "pending")
    throw new SubmissionError(
      409,
      "Only pending submissions can be approved. Refresh the queue.",
    );
  if (!row.image_bytes || !row.image_width || !row.image_height)
    throw new SubmissionError(
      409,
      "This submission has no complete image to publish.",
    );
  const attempt = randomUUID();
  const prefix = `images/${row.id}/${attempt}`;
  const job: PublicationJob = {
    id,
    imageKey: `${prefix}/image.png`,
    thumbnailKey: `${prefix}/thumbnail.webp`,
    markerKey: `publication-jobs/${attempt}.json`,
    createdAt: Date.now(),
  };
  // Durable recovery record precedes public copies. Each attempt uses its own keys.
  await deps.mark(job);
  try {
    await deps.copy(
      `${row.private_object_prefix}/image.png`,
      job.imageKey,
      "image/png",
    );
    await deps.copy(
      `${row.private_object_prefix}/thumbnail.webp`,
      job.thumbnailKey,
      "image/webp",
    );
    if (Date.now() - job.createdAt > 5 * 60 * 1000)
      throw new Error("Approval expired");
    const saved = await deps.transition(id, "pending", {
      status: "published",
      public_image_key: job.imageKey,
      public_thumbnail_key: job.thumbnailKey,
      license_code: "download-only",
      published_at: new Date().toISOString(),
    });
    if (!saved)
      throw new SubmissionError(
        409,
        "The submission changed during approval. Refresh the queue.",
      );
  } catch (error) {
    // A lost database response may still mean success. Never remove committed files.
    const current = await deps.get(id);
    if (
      current?.public_image_key === job.imageKey &&
      current.status === "published"
    ) {
      await deps.unmark(job.markerKey).catch(() => {});
      return { status: "published", slug: current.slug };
    }
    // Deletion may already be using these keys; removing them again is safe.
    await deps.remove(job.imageKey);
    await deps.remove(job.thumbnailKey);
    await deps.unmark(job.markerKey);
    throw error;
  }
  await deps.unmark(job.markerKey).catch(() => {});
  return { status: "published", slug: row.slug };
}
export async function rejectImage(id: string, deps: ReviewDependencies) {
  if (!(await deps.transition(id, "pending", { status: "rejected" })))
    throw new SubmissionError(
      409,
      "Only pending submissions can be rejected. Refresh the queue.",
    );
  return { status: "rejected" };
}
export async function recoverPublication(
  job: PublicationJob,
  deps: ReviewDependencies,
  now = Date.now(),
) {
  if (now - job.createdAt < 60 * 60 * 1000) return false;
  const row = await deps.get(job.id);
  if (row?.public_image_key !== job.imageKey || row.status === "deleted") {
    await deps.remove(job.imageKey);
    await deps.remove(job.thumbnailKey);
  }
  await deps.unmark(job.markerKey);
  return true;
}

export async function withdrawImage(id: string, deps: ReviewDependencies) {
  const row = await deps.get(id);
  if (!row) throw new SubmissionError(404, "Image not found.");
  if (
    row.status !== "published" ||
    !row.public_image_key ||
    !row.public_thumbnail_key
  )
    throw new SubmissionError(
      409,
      "This image is no longer published. Refresh the queue.",
    );
  const job: PublicationJob = {
    id,
    imageKey: row.public_image_key,
    thumbnailKey: row.public_thumbnail_key,
    markerKey: `publication-jobs/${randomUUID()}.json`,
    createdAt: Date.now(),
  };
  await deps.mark(job);
  // Hide the page first. Unique existing keys remain in the recovery record if storage fails.
  if (
    !(await deps.transition(id, "published", {
      status: "rejected",
      public_image_key: null,
      public_thumbnail_key: null,
      published_at: null,
    }))
  )
    throw new SubmissionError(409, "The image changed. Refresh the queue.");
  try {
    await deps.remove(job.imageKey);
    await deps.remove(job.thumbnailKey);
    await deps.unmark(job.markerKey);
  } catch {
    return { status: "rejected", cleanupPending: true };
  }
  return { status: "rejected", cleanupPending: false };
}
