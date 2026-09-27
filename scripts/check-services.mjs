import { HeadBucketCommand } from "@aws-sdk/client-s3";
import {
  ConfigurationError,
  readR2Config,
  readSupabaseConfig,
} from "../lib/server/config.ts";
import { createR2Client, createSupabaseAdmin } from "../lib/server/clients.ts";

let failed = false;
try {
  readSupabaseConfig();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("images")
    .select("id", { head: true })
    .limit(1);
  if (error) {
    failed = true;
    console.error(
      "Supabase: check failed. Verify the URL, backend secret key, and that migration 001 has been applied.",
    );
  } else
    console.log(
      "Supabase: connected; images table is accessible to the backend.",
    );
} catch (error) {
  failed = true;
  console.error(
    error instanceof ConfigurationError
      ? error.message
      : "Supabase: connection failed. Check your network and configuration.",
  );
}

// Read-only readiness checks for the next step; never consume a quota slot.
try {
  const { error } = await createSupabaseAdmin()
    .from("submission_limits")
    .select("scope", { head: true })
    .limit(1);
  if (error) {
    failed = true;
    console.error(
      "Publishing: apply supabase/migrations/002_submission_limits.sql in the Supabase SQL editor.",
    );
  } else {
    console.log("Publishing: submission limits table is accessible.");
    // The function rejects this sentinel before any lock, cleanup, or quota write.
    const { error: probeError } = await createSupabaseAdmin().rpc(
      "reserve_submission_attempt",
      {
        p_actor_hash: "invalid-readiness-probe",
        p_token_hash: "invalid-readiness-probe",
      },
    );
    if (
      probeError?.code === "P0001" &&
      probeError.message === "Invalid reservation"
    ) {
      console.log("Publishing: submission quota function is accessible.");
    } else {
      failed = true;
      console.error(
        "Publishing: reservation function is missing or incompatible. Apply migrations 002, 005, then 006 in that order; see docs/RELEASE_STEPS.md.",
      );
    }
  }
} catch {
  failed = true;
  console.error("Publishing: database readiness could not be checked.");
}
if (
  !process.env.TURNSTILE_SITE_KEY?.trim() ||
  !process.env.TURNSTILE_SECRET_KEY?.trim()
) {
  failed = true;
  console.error(
    "Publishing: add TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to .env.local or Netlify.",
  );
} else
  console.log(
    "Publishing: Turnstile keys are present; browser verification still needs testing.",
  );

{
  try {
    const db = createSupabaseAdmin();
    const { error: tableError } = await db
      .from("image_reports")
      .select("id", { head: true })
      .limit(1);
    const { error: probe } = await db.rpc("report_image", {
      p_slug: "",
      p_reason: "invalid-readiness-probe",
      p_actor_hash: "invalid-readiness-probe",
    });
    if (
      tableError ||
      probe?.code !== "P0001" ||
      probe.message !== "Invalid report" ||
      (process.env.ADMIN_ACCESS_KEY?.trim().length || 0) < 8
    ) {
      failed = true;
      console.error(
        "Moderation: apply 003_image_reports.sql and configure owner access. Every submission requires owner review.",
      );
    } else console.log("Moderation: reporting and owner access are ready.");
  } catch {
    failed = true;
    console.error(
      "Moderation: readiness check failed; submissions remain pending.",
    );
  }
}

try {
  const { error } = await createSupabaseAdmin().rpc("reserve_owner_login", {
    p_actor_hash: "invalid-readiness-probe",
  });
  if (error?.code !== "P0001" || error.message !== "Invalid actor") {
    failed = true;
    console.error(
      "Owner login: apply migration 006_launch_limits.sql before deploying.",
    );
  } else
    console.log("Owner login: persistent attempt protection is accessible.");
} catch {
  failed = true;
  console.error("Owner login: readiness could not be checked.");
}

let r2;
try {
  const config = readR2Config();
  r2 = createR2Client();
  for (const [label, bucket] of [
    ["private submissions", config.privateBucket],
    ["public images", config.publicBucket],
  ]) {
    try {
      await r2.send(new HeadBucketCommand({ Bucket: bucket }), {
        abortSignal: AbortSignal.timeout(15000),
      });
      console.log(`R2: ${label} bucket is accessible to the backend.`);
    } catch {
      failed = true;
      console.error(
        `R2: ${label} bucket check failed. Verify the bucket name and token permissions.`,
      );
    }
  }
  console.log(
    "Reminder: verify in Cloudflare that the submissions bucket has no public access. HeadBucket cannot check that setting.",
  );
} catch (error) {
  failed = true;
  console.error(
    error instanceof ConfigurationError
      ? error.message
      : "R2: connection failed. Check your network and configuration.",
  );
} finally {
  r2?.destroy();
}

console.log(
  "Read-only check complete. No files uploaded or database rows changed.",
);
process.exitCode = failed ? 1 : 0;
