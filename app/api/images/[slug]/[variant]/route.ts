import { imageCacheControl } from "@/lib/image-cache";
import { publishedFile } from "@/lib/server/gallery";
import { submissionFailure } from "@/lib/server/submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    slug: string;
    variant: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug, variant } = await context.params;

    // Validate the image variant.
    const allowedVariants = ["image", "thumbnail", "download"];

    if (!allowedVariants.includes(variant)) {
      return Response.json(
        {
          error: "Invalid image variant.",
        },
        {
          status: 404,
        },
      );
    }

    // Retrieve the published image from storage.
    const bytes = await publishedFile(slug, variant);

    if (!bytes || bytes.length === 0) {
      return Response.json(
        {
          error: "Image file not found.",
        },
        {
          status: 404,
        },
      );
    }

    const isThumbnail = variant === "thumbnail";
    const isDownload = variant === "download";

    const contentType = isThumbnail ? "image/webp" : "image/png";

    const filename = `${slug}.png`;
    const body =
      bytes.buffer instanceof ArrayBuffer
        ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        : new Uint8Array(bytes);

    // Return the image with the correct response headers.
    return new Response(body, {
      status: 200,

      headers: {
        "Content-Type": contentType,

        "Content-Length": String(bytes.length),

        "Cache-Control": imageCacheControl(variant),

        "X-Content-Type-Options": "nosniff",

        ...(isDownload
          ? {
              "Content-Disposition": `attachment; filename="${filename}"`,
            }
          : {
              "Content-Disposition": "inline",
            }),
      },
    });
  } catch (error) {
    console.error("Published image request failed:", error);

    return submissionFailure(error);
  }
}
