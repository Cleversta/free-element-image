import { requireOwner, ownerOrigin } from "@/lib/server/owner";
import {
  readBody,
  submissionResponse,
  submissionFailure,
  SubmissionError,
} from "@/lib/server/submissions";
import { createSupabaseAdmin } from "@/lib/server/clients";
import { galleryServices } from "@/lib/server/gallery";
import { approveImage, rejectImage, withdrawImage } from "@/lib/server/review";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    requireOwner(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";
    if (!["pending", "published", "rejected", "reported"].includes(status))
      throw new SubmissionError(400, "Invalid queue.");
    const page = Math.max(
      1,
      Math.min(10000, Number(url.searchParams.get("page")) || 1),
    );
    let query = createSupabaseAdmin()
      .from("images")
      .select(
        status === "reported"
          ? "id,slug,title,description,status,created_at,reports:image_reports!inner(id,reason,resolved_at)"
          : "id,slug,title,description,status,created_at",
      )
      .eq("status", status === "reported" ? "published" : status);
    if (status === "reported") query = query.is("reports.resolved_at", null);
    const { data, error } = await query
      .order("created_at")
      .order("id")
      .range((page - 1) * 20, page * 20);
    if (error) throw new Error("Queue unavailable");
    return submissionResponse({
      images: data.slice(0, 20),
      more: data.length > 20,
    });
  } catch (error) {
    return submissionFailure(error);
  }
}
export async function POST(request: Request) {
  let services: ReturnType<typeof galleryServices> | undefined;
  try {
    requireOwner(request);
    ownerOrigin(request);
    const body = await readBody(request, 50000);
    if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/.test(body.id))
      throw new SubmissionError(400, "Invalid submission.");
    if (
      !["approve", "reject", "withdraw", "dismiss"].includes(
        String(body.action),
      )
    )
      throw new SubmissionError(400, "Unknown review action.");
    if (body.action === "dismiss") {
      if (
        typeof body.reportIds !== "object" ||
        !Array.isArray(body.reportIds) ||
        body.reportIds.length > 1000 ||
        body.reportIds.some(
          (id) => typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id),
        )
      )
        throw new SubmissionError(
          400,
          "Refresh the reports before dismissing them.",
        );
      const { error } = await createSupabaseAdmin()
        .from("image_reports")
        .update({ resolved_at: new Date().toISOString() })
        .eq("image_id", body.id)
        .in("id", body.reportIds)
        .is("resolved_at", null);
      if (error) throw new Error("Reports unavailable");
      return submissionResponse({ status: "dismissed" });
    }
    services = galleryServices();
    if (body.action === "withdraw")
      return submissionResponse(await withdrawImage(body.id, services.deps));
    return submissionResponse(
      body.action === "approve"
        ? await approveImage(
            body.id,
            body.rightsConfirmed === true,
            services.deps,
          )
        : await rejectImage(body.id, services.deps),
    );
  } catch (error) {
    return submissionFailure(error);
  } finally {
    services?.close();
  }
}
