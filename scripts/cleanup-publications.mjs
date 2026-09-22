// Remove only orphaned public copies from interrupted approvals older than one hour.
// Successfully published images are preserved. Requires the same server credentials.
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createR2Client } from "../lib/server/clients.ts";
import { readR2Config } from "../lib/server/config.ts";
import { galleryServices } from "../lib/server/gallery.ts";
import { recoverPublication } from "../lib/server/review.ts";
const r2 = createR2Client();
const { privateBucket } = readR2Config();
const services = galleryServices();
let recovered = 0;
try {
  let cursor;
  do {
    const page = await r2.send(
      new ListObjectsV2Command({
        Bucket: privateBucket,
        Prefix: "publication-jobs/",
        ContinuationToken: cursor,
      }),
      { abortSignal: AbortSignal.timeout(15000) },
    );
    for (const object of page.Contents || []) {
      if (
        !object.Key?.endsWith(".json") ||
        !object.LastModified ||
        Date.now() - object.LastModified.getTime() < 3600000
      )
        continue;
      const file = await r2.send(
        new GetObjectCommand({ Bucket: privateBucket, Key: object.Key }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
      if (!file.Body || !file.ContentLength || file.ContentLength > 4096)
        throw new Error("Invalid recovery record");
      const job = JSON.parse(await file.Body.transformToString());
      if (
        job.markerKey !== object.Key ||
        !/^[a-f0-9-]{36}$/.test(job.id) ||
        !Number.isFinite(job.createdAt) ||
        typeof job.imageKey !== "string" ||
        !job.imageKey.startsWith(`images/${job.id}/`) ||
        !job.imageKey.endsWith("/image.png") ||
        job.thumbnailKey !==
          job.imageKey.replace("/image.png", "/thumbnail.webp")
      )
        throw new Error("Invalid recovery record");
      if (await recoverPublication(job, services.deps)) recovered++;
    }
    cursor = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (cursor);
  console.log(
    `Publication recovery complete: ${recovered} records resolved. Published images preserved.`,
  );
} catch {
  console.error(
    "Publication recovery stopped. Check service connections and recovery records; no secrets are printed.",
  );
  process.exitCode = 1;
} finally {
  r2.destroy();
  services.close();
}
