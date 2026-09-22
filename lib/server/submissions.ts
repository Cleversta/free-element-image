import "server-only";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import sharp from "sharp";

export const MAX_BODY = 4 * 1024 * 1024;
const MAX_PNG = 2800000;
export class SubmissionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export type Submission = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  private_object_prefix: string;
  public_image_key: string | null;
  public_thumbnail_key: string | null;
};
export type SubmissionDependencies = {
  siteUrl: string;
  hashKey: string;
  netlify: boolean;
  development: boolean;
  verify: (token: string) => Promise<boolean>;
  render: (
    scene: unknown,
  ) => Promise<{ png: Buffer; thumbnail: Buffer; verified: boolean }>;
  autoPublish: (id: string) => Promise<{ status: string; slug: string }>;
  textNeedsReview: (title: string, description: string) => boolean;
  find: (hash: string) => Promise<Submission | null>;
  reserve: (actor: string) => Promise<boolean>;
  insert: (row: Record<string, unknown>) => Promise<void>;
  transition: (
    id: string,
    from: string[],
    patch: Record<string, unknown>,
  ) => Promise<boolean>;
  put: (key: string, bytes: Buffer, type: string) => Promise<void>;
  remove: (key: string, isPublic?: boolean) => Promise<void>;
};
export function tokenHash(token: unknown): string {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw new SubmissionError(400, "Invalid private management link.");
  return createHash("sha256").update(token).digest("hex");
}
export async function readBody(
  request: Request,
  max = MAX_BODY,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new SubmissionError(415, "Send JSON data.");
  if (Number(request.headers.get("content-length")) > max)
    throw new SubmissionError(413, "This image is too large to submit.");
  const reader = request.body?.getReader();
  if (!reader) throw new SubmissionError(400, "Missing submission.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new SubmissionError(413, "This image is too large to submit.");
    }
    chunks.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new SubmissionError(400, "Invalid submission data.");
  }
}
export function checkOrigin(request: Request, siteUrl: string) {
  if (request.headers.get("origin") !== new URL(siteUrl).origin)
    throw new SubmissionError(
      403,
      "Open the editor on this website before submitting.",
    );
}
export function actorHash(
  request: Request,
  deps: Pick<
    SubmissionDependencies,
    "siteUrl" | "development" | "netlify" | "hashKey"
  >,
) {
  const hostname = new URL(request.url).hostname;
  const local =
    deps.development &&
    ["localhost", "127.0.0.1", "[::1]"].includes(hostname) &&
    ["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(deps.siteUrl).hostname,
    );
  const ip = deps.netlify
    ? request.headers.get("x-nf-client-connection-ip")?.trim()
    : local
      ? "127.0.0.1"
      : null;
  if (!ip || !isIP(ip))
    throw new SubmissionError(
      503,
      "Publishing is not configured for this host yet.",
    );
  return createHmac("sha256", deps.hashKey).update(ip).digest("hex");
}
export async function normalizePng(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil(MAX_PNG / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    throw new SubmissionError(
      400,
      "Submit a PNG exported from the editor (under 2.8 MB).",
    );
  const bytes = Buffer.from(value, "base64");
  if (
    bytes.length > MAX_PNG ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new SubmissionError(400, "Submit a valid PNG image.");
  try {
    const metadata = await sharp(bytes, {
      limitInputPixels: 1200 * 800,
      animated: true,
    }).metadata();
    if (
      metadata.format !== "png" ||
      metadata.width !== 1200 ||
      metadata.height !== 800 ||
      (metadata.pages ?? 1) !== 1
    )
      throw new Error();
    const png = await sharp(bytes, { limitInputPixels: 1200 * 800 })
      .png()
      .toBuffer();
    const thumbnail = await sharp(png)
      .resize(480, 320)
      .webp({ quality: 80 })
      .toBuffer();
    return { png, thumbnail };
  } catch {
    throw new SubmissionError(
      400,
      "The image must be a valid 1200 × 800 PNG from the editor.",
    );
  }
}
export async function submit(request: Request, deps: SubmissionDependencies) {
  checkOrigin(request, deps.siteUrl);
  const actor = actorHash(request, deps);
  const body = await readBody(request, 130000);
  const hash = tokenHash(body.managementToken);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (
    title.length < 3 ||
    title.length > 120 ||
    description.length > 1000 ||
    body.consent !== true
  )
    throw new SubmissionError(
      400,
      "Enter a title (3–120 characters) and agree to submit your image for public sharing.",
    );
  if (
    typeof body.challenge !== "string" ||
    body.challenge.length > 2048 ||
    !(await deps.verify(body.challenge))
  )
    throw new SubmissionError(
      403,
      "Verification expired or failed. Please try again.",
    );
  const existing = await deps.find(hash);
  if (existing) {
    if (["pending", "published"].includes(existing.status))
      return { id: existing.id, status: existing.status };
    throw new SubmissionError(
      409,
      "This submission is still processing or has been removed. Check your private management link.",
    );
  }
  if (!(await deps.reserve(actor)))
    throw new SubmissionError(
      429,
      "The submission limit has been reached. Please try again later; editing and downloads remain available.",
    );
  if (body.png !== undefined)
    throw new SubmissionError(
      400,
      "Image uploads are no longer accepted. Refresh the editor and submit the scene.",
    );
  const { png, thumbnail, verified } = await deps.render(body.scene);
  const automatic = verified && !deps.textNeedsReview(title, description);
  const id = randomUUID();
  const prefix = `submissions/${id}`;
  await deps.insert({
    id,
    slug: `scene-${id}`,
    title,
    description,
    management_token_hash: hash,
    private_object_prefix: prefix,
    sharing_consent_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  try {
    await deps.put(`${prefix}/image.png`, png, "image/png");
    await deps.put(`${prefix}/thumbnail.webp`, thumbnail, "image/webp");
    if (
      !(await deps.transition(id, ["uploading"], {
        status: "pending",
        image_bytes: png.length,
        image_width: 1200,
        image_height: 800,
        expires_at: null,
      }))
    )
      throw new Error("Submission transition failed");
  } catch {
    // Preserve a receipt for recovery. Never report a failed upload as successful.
    // Do not delete objects if the final database update succeeded but its response was lost.
    const current = await deps.find(hash).catch(() => null);
    if (current?.status === "pending") return { id, status: "pending" };
    if (
      current?.status === "uploading" &&
      (await deps
        .transition(id, ["uploading"], { status: "rejected" })
        .catch(() => false))
    ) {
      await Promise.allSettled([
        deps.remove(`${prefix}/image.png`),
        deps.remove(`${prefix}/thumbnail.webp`),
      ]);
    }
    throw new SubmissionError(
      503,
      "The upload could not finish. Use your private management link to check its status or remove it.",
    );
  }
  if (automatic) {
    try {
      return { id, ...(await deps.autoPublish(id)) };
    } catch {
      // A lost publication response must not claim a public image is still private.
      const current = await deps.find(hash);
      if (current?.status === "published")
        return { id, status: "published", slug: `scene-${id}` };
      if (current?.status !== "pending")
        throw new SubmissionError(
          503,
          "The submission status changed. Check your private management link before retrying.",
        );
    }
  }
  return { id, status: "pending" };
}
export async function manage(request: Request, deps: SubmissionDependencies) {
  checkOrigin(request, deps.siteUrl);
  const body = await readBody(request, 2048);
  const row = await deps.find(tokenHash(body.managementToken));
  if (!row)
    throw new SubmissionError(
      404,
      "No submission was found for this private link.",
    );
  if (body.action === "delete" && row.status !== "deleted") {
    if (
      row.status === "uploading" &&
      Date.now() - new Date(row.created_at).getTime() < 10 * 60 * 1000
    )
      throw new SubmissionError(
        409,
        "Your upload is still processing. Try removing it in a few minutes.",
      );
    if (!(await deps.transition(row.id, [row.status], { status: "deleting" })))
      throw new SubmissionError(
        409,
        "The submission changed. Refresh its status and try again.",
      );
    await deps.remove(`${row.private_object_prefix}/image.png`);
    await deps.remove(`${row.private_object_prefix}/thumbnail.webp`);
    if (row.public_image_key) await deps.remove(row.public_image_key, true);
    if (row.public_thumbnail_key)
      await deps.remove(row.public_thumbnail_key, true);
    if (
      !(await deps.transition(row.id, ["deleting"], {
        status: "deleted",
        deleted_at: new Date().toISOString(),
      }))
    )
      throw new Error("Deletion transition failed");
    row.status = "deleted";
  } else if (body.action !== "status" && body.action !== "delete")
    throw new SubmissionError(400, "Unknown management action.");
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
  };
}
export function submissionResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export function submissionFailure(error: unknown) {
  return submissionResponse(
    {
      error:
        error instanceof SubmissionError
          ? error.message
          : "The service is temporarily unavailable. Please try again.",
    },
    error instanceof SubmissionError ? error.status : 503,
  );
}
