import {
  publishSettings,
  verifyChallenge,
} from "@/lib/server/submission-services";
import {
  actorHash,
  checkOrigin,
  readBody,
  SubmissionError,
  submissionFailure,
  submissionResponse,
} from "@/lib/server/submissions";
import { createSupabaseAdmin } from "@/lib/server/clients";
import { readSupabaseConfig } from "@/lib/server/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const settings = publishSettings();
  return submissionResponse({
    enabled: !!settings,
    siteKey: settings?.siteKey || null,
  });
}
export async function POST(request: Request) {
  try {
    const settings = publishSettings();
    if (!settings)
      throw new SubmissionError(503, "Reporting is temporarily unavailable.");
    checkOrigin(request, settings.siteUrl);
    const body = await readBody(request, 4096);
    if (
      typeof body.slug !== "string" ||
      !/^scene-[a-f0-9-]{36}$/.test(body.slug) ||
      !["spam", "inappropriate", "rights", "broken"].includes(
        String(body.reason),
      )
    )
      throw new SubmissionError(400, "Choose a report reason.");
    if (
      typeof body.challenge !== "string" ||
      body.challenge.length > 2048 ||
      !(await verifyChallenge(
        body.challenge,
        settings.secret,
        new URL(settings.siteUrl).hostname,
        fetch,
        "report",
      ))
    )
      throw new SubmissionError(403, "Verification expired. Please try again.");
    const actor = actorHash(request, {
      siteUrl: settings.siteUrl,
      hashKey: readSupabaseConfig().secretKey,
      netlify: process.env.NETLIFY === "true",
      development: process.env.NODE_ENV === "development",
    });
    const { data, error } = await createSupabaseAdmin().rpc("report_image", {
      p_slug: body.slug,
      p_reason: body.reason,
      p_actor_hash: actor,
    });
    if (error) throw new Error("Reporting unavailable");
    if (data === "not_found")
      throw new SubmissionError(404, "This image is no longer public.");
    if (data === "limited")
      throw new SubmissionError(
        429,
        "Report limit reached. Please try again later.",
      );
    if (data !== "received") throw new Error("Reporting unavailable");
    return submissionResponse({ received: true });
  } catch (error) {
    return submissionFailure(error);
  }
}
