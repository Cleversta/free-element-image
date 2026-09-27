import "server-only";
import { createSupabaseAdmin } from "./clients.ts";
import { readSupabaseConfig } from "./config.ts";
import { isNetlifyEnvironment } from "./submission-services.ts";
import { actorHash, SubmissionError } from "./submissions.ts";

export async function reserveOwnerLogin(request: Request) {
  const actor = actorHash(request, {
    siteUrl: process.env.SITE_URL!,
    hashKey: readSupabaseConfig().secretKey,
    netlify: isNetlifyEnvironment(),
    development: process.env.NODE_ENV === "development",
  });
  const { data, error } = await createSupabaseAdmin().rpc(
    "reserve_owner_login",
    { p_actor_hash: actor },
  );
  if (error)
    throw new SubmissionError(
      503,
      "Owner sign-in protection is unavailable. Check the launch limits migration.",
    );
  if (data !== true)
    throw new SubmissionError(
      429,
      "Too many sign-in attempts. Please wait 15 minutes and try again.",
    );
}
