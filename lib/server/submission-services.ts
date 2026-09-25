import "server-only";
import { renderSubmission, textNeedsReview } from "./render-submission.ts";
import { approveImage } from "./review.ts";
import { galleryServices } from "./gallery.ts";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client, createSupabaseAdmin } from "./clients.ts";
import { readR2Config, readSupabaseConfig } from "./config.ts";
import { SubmissionError } from "./submissions.ts";
import type { Submission, SubmissionDependencies } from "./submissions.ts";

export function publishSettings() {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteUrl = process.env.SITE_URL?.trim();

  if (!siteKey || !secret || !siteUrl) {
    console.error("Missing publishing environment variable:", {
      TURNSTILE_SITE_KEY: !!siteKey,
      TURNSTILE_SECRET_KEY: !!secret,
      SITE_URL: !!siteUrl,
    });

    return null;
  }

  try {
    const url = new URL(siteUrl);

    const local =
      process.env.NODE_ENV === "development" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

    if (
      (!local && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      console.error("Invalid SITE_URL:", siteUrl);
      return null;
    }

    readR2Config();
    readSupabaseConfig();

    return {
      siteKey,
      secret,
      siteUrl: url.origin,
    };
  } catch (error) {
    console.error("publishSettings configuration error:", error);
    return null;
  }
}

export async function verifyChallenge(
  token: string,
  secret: string,
  hostname: string,
  fetcher: typeof fetch = fetch,
  action = "publish",
) {
  if (!token) return false;
  const response = await fetcher(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) return false;
  const data = await response.json();
  return (
    data.success === true &&
    data.action === action &&
    data.hostname === hostname
  );
}

export function submissionServices(requirePublish = false) {
  const settings = publishSettings();
  if (requirePublish && !settings)
    throw new SubmissionError(
      503,
      "Publishing is not available yet. You can still save and download your scene.",
    );
  const siteUrl = settings?.siteUrl || process.env.SITE_URL?.trim();
  if (!siteUrl)
    throw new SubmissionError(
      503,
      "The website address has not been configured.",
    );
  const db = createSupabaseAdmin();
  const r2 = createR2Client();
  const config = readR2Config();
  const deps: SubmissionDependencies = {
    siteUrl,
    hashKey: readSupabaseConfig().secretKey,
    netlify: process.env.NETLIFY === "true",
    development: process.env.NODE_ENV === "development",
    verify: (token) =>
      settings
        ? verifyChallenge(
            token,
            settings.secret,
            new URL(settings.siteUrl).hostname,
          )
        : Promise.resolve(false),
    render: renderSubmission,
    textNeedsReview,
    async autoPublish(id) {
      // Automatic publication requires reporting and owner removal to be ready.
      if (process.env.AUTO_PUBLISH !== "true") throw new Error("Manual mode");
      const { error } = await db
        .from("image_reports")
        .select("id", { head: true })
        .limit(1);
      if (error || !process.env.ADMIN_ACCESS_KEY)
        throw new Error("Moderation unavailable");
      const { error: probe } = await db.rpc("report_image", {
        p_slug: "",
        p_reason: "invalid-readiness-probe",
        p_actor_hash: "invalid-readiness-probe",
      });
      if (probe?.code !== "P0001" || probe.message !== "Invalid report")
        throw new Error("Reporting function unavailable");
      const services = galleryServices();
      try {
        return await approveImage(id, true, services.deps);
      } finally {
        services.close();
      }
    },
    async find(hash) {
      const { data, error } = await db
        .from("images")
        .select(
          "id,title,status,created_at,private_object_prefix,public_image_key,public_thumbnail_key",
        )
        .eq("management_token_hash", hash)
        .maybeSingle();
      if (error) throw new Error("Database unavailable");
      return data as Submission | null;
    },
    async reserve(actor) {
      const { data, error } = await db.rpc("reserve_submission", {
        p_actor_hash: actor,
      });
      if (error?.code === "PGRST202")
        throw new SubmissionError(
          503,
          "Publishing setup is incomplete. The site owner needs to apply the submission limits migration.",
        );
      if (error) throw new Error("Submission limits unavailable");
      return data === true;
    },
    async insert(row) {
      const { error } = await db.from("images").insert(row);
      if (error?.code === "23505")
        throw new SubmissionError(
          409,
          "This submission is already processing. Check your private management link.",
        );
      if (error) throw new Error("Database unavailable");
    },
    async transition(id, from, patch) {
      const { data, error } = await db
        .from("images")
        .update(patch)
        .eq("id", id)
        .in("status", from)
        .select("id");
      if (error) throw new Error("Database unavailable");
      return data.length === 1;
    },
    async put(key, bytes, type) {
      await r2.send(
        new PutObjectCommand({
          Bucket: config.privateBucket,
          Key: key,
          Body: bytes,
          ContentType: type,
          CacheControl: "private, no-store",
        }),
        { abortSignal: AbortSignal.timeout(20000) },
      );
    },
    async remove(key, isPublic = false) {
      await r2.send(
        new DeleteObjectCommand({
          Bucket: isPublic ? config.publicBucket : config.privateBucket,
          Key: key,
        }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
    },
  };
  return { deps, close: () => r2.destroy() };
}
