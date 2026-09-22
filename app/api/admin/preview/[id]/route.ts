import { requireOwner } from "@/lib/server/owner";
import { galleryServices, imageBytes } from "@/lib/server/gallery";
import { submissionFailure, SubmissionError } from "@/lib/server/submissions";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let services: ReturnType<typeof galleryServices> | undefined;
  try {
    requireOwner(request);
    const { id } = await context.params;
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new SubmissionError(404, "Image not found.");
    services = galleryServices();
    const row = await services.deps.get(id);
    if (!row || !["pending", "published", "rejected"].includes(row.status))
      throw new SubmissionError(404, "Image not found.");
    const bytes = await imageBytes(
      `${row.private_object_prefix}/image.png`,
      false,
    );
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return submissionFailure(error);
  } finally {
    services?.close();
  }
}
