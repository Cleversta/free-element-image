import { publishedFile } from "@/lib/server/gallery";
import { submissionFailure } from "@/lib/server/submissions";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; variant: string }> },
) {
  try {
    const { slug, variant } = await context.params;
    const bytes = await publishedFile(slug, variant);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": variant === "thumbnail" ? "image/webp" : "image/png",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(variant === "download"
          ? { "Content-Disposition": `attachment; filename="${slug}.png"` }
          : {}),
      },
    });
  } catch (error) {
    return submissionFailure(error);
  }
}
