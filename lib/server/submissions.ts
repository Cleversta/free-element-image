import "server-only";

import { sceneCategories } from "../gallery-filters.ts";

import {
  createHash,
  createHmac,
  randomUUID,
} from "node:crypto";

import { isIP } from "node:net";

import sharp from "sharp";

export const MAX_BODY = 4 * 1024 * 1024;

const MAX_PNG = 2800000;

// ============================================================
// ERRORS
// ============================================================

export class SubmissionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);

    this.name = "SubmissionError";
    this.status = status;
  }
}

// ============================================================
// TYPES
// ============================================================

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

  render: (scene: unknown) => Promise<{
    png: Buffer;
    thumbnail: Buffer;
    verified: boolean;
    editableScene?: string;
  }>;

  autoPublish: (
    id: string,
  ) => Promise<{
    status: string;
    slug: string;
  }>;

  textNeedsReview: (
    title: string,
    description: string,
  ) => boolean;

  find: (
    hash: string,
  ) => Promise<Submission | null>;

  reserve: (
    actor: string,
  ) => Promise<boolean>;

  insert: (
    row: Record<string, unknown>,
  ) => Promise<void>;

  transition: (
    id: string,
    from: string[],
    patch: Record<string, unknown>,
  ) => Promise<boolean>;

  put: (
    key: string,
    bytes: Buffer,
    type: string,
  ) => Promise<void>;

  remove: (
    key: string,
    isPublic?: boolean,
  ) => Promise<void>;
};

// ============================================================
// MANAGEMENT TOKEN
// ============================================================

export function tokenHash(token: unknown): string {
  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    throw new SubmissionError(
      400,
      "Invalid private management link.",
    );
  }

  return createHash("sha256")
    .update(token)
    .digest("hex");
}

// ============================================================
// REQUEST BODY
// ============================================================

export async function readBody(
  request: Request,
  max = MAX_BODY,
): Promise<Record<string, unknown>> {
  if (
    !request.headers
      .get("content-type")
      ?.startsWith("application/json")
  ) {
    throw new SubmissionError(
      415,
      "Send JSON data.",
    );
  }

  if (
    Number(request.headers.get("content-length")) > max
  ) {
    throw new SubmissionError(
      413,
      "This image is too large to submit.",
    );
  }

  const reader = request.body?.getReader();

  if (!reader) {
    throw new SubmissionError(
      400,
      "Missing submission.",
    );
  }

  const chunks: Uint8Array[] = [];

  let size = 0;

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    size += value.length;

    if (size > max) {
      await reader.cancel();

      throw new SubmissionError(
        413,
        "This image is too large to submit.",
      );
    }

    chunks.push(value);
  }

  try {
    const body = JSON.parse(
      Buffer.concat(chunks).toString("utf8"),
    );

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      throw new Error();
    }

    return body;
  } catch {
    throw new SubmissionError(
      400,
      "Invalid submission data.",
    );
  }
}

// ============================================================
// ORIGIN VALIDATION
// ============================================================

export function checkOrigin(
  request: Request,
  siteUrl: string,
) {
  const expectedOrigin = new URL(siteUrl).origin;

  const requestOrigin = request.headers.get("origin");

  if (requestOrigin !== expectedOrigin) {
    throw new SubmissionError(
      403,
      "Open the editor on this website before submitting.",
    );
  }
}

// ============================================================
// NETLIFY CLIENT IP
// ============================================================

function isLocalHostname(hostname: string): boolean {
  return [
    "localhost",
    "127.0.0.1",
    "[::1]",
  ].includes(hostname);
}

function getClientIp(
  request: Request,
  deps: Pick<
    SubmissionDependencies,
    "siteUrl" | "development" | "netlify"
  >,
): string | null {
  const hostname = new URL(request.url).hostname;

  const siteHostname = new URL(
    deps.siteUrl,
  ).hostname;

  // Local development is allowed only when both
  // the request and configured site use local hostnames.
  const local =
    deps.development &&
    isLocalHostname(hostname) &&
    isLocalHostname(siteHostname);

  if (local) {
    return "127.0.0.1";
  }

  // Only trust proxy-provided IP headers when the app
  // is running inside the trusted Netlify environment.
  if (!deps.netlify) {
    return null;
  }

  // First try Netlify's client connection IP.
  const netlifyIp = request.headers
    .get("x-nf-client-connection-ip")
    ?.trim();

  if (netlifyIp && isIP(netlifyIp)) {
    return netlifyIp;
  }

  return null;
}

// ============================================================
// ACTOR HASH
// ============================================================

export function actorHash(
  request: Request,
  deps: Pick<
    SubmissionDependencies,
    | "siteUrl"
    | "development"
    | "netlify"
    | "hashKey"
  >,
): string {
  const clientIp = getClientIp(request, deps);

  if (!clientIp) {
    throw new SubmissionError(
      503,
      "Publishing is not configured for this host yet.",
    );
  }

  if (!deps.hashKey) {
    throw new SubmissionError(
      503,
      "Publishing security is not configured.",
    );
  }

  return createHmac(
    "sha256",
    deps.hashKey,
  )
    .update(clientIp)
    .digest("hex");
}

// ============================================================
// PNG VALIDATION
// ============================================================

export async function normalizePng(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil(MAX_PNG / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new SubmissionError(
      400,
      "Submit a PNG exported from the editor (under 2.8 MB).",
    );
  }

  const bytes = Buffer.from(
    value,
    "base64",
  );

  if (
    bytes.length > MAX_PNG ||
    !bytes
      .subarray(0, 8)
      .equals(
        Buffer.from([
          137,
          80,
          78,
          71,
          13,
          10,
          26,
          10,
        ]),
      )
  ) {
    throw new SubmissionError(
      400,
      "Submit a valid PNG image.",
    );
  }

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
    ) {
      throw new Error();
    }

    const png = await sharp(bytes, {
      limitInputPixels: 1200 * 800,
    })
      .png()
      .toBuffer();

    const thumbnail = await sharp(png)
      .resize(480, 320)
      .webp({
        quality: 80,
      })
      .toBuffer();

    return {
      png,
      thumbnail,
    };
  } catch {
    throw new SubmissionError(
      400,
      "The image must be a valid 1200 × 800 PNG from the editor.",
    );
  }
}

// ============================================================
// SUBMIT SCENE
// ============================================================

export async function submit(
  request: Request,
  deps: SubmissionDependencies,
) {
  checkOrigin(
    request,
    deps.siteUrl,
  );

  actorHash(request, deps);

  const body = await readBody(
    request,
    130000,
  );

  const hash = tokenHash(
    body.managementToken,
  );

  const category =
    body.category ?? "nature";

  if (
    !sceneCategories.some(
      (c) => c === category,
    )
  ) {
    throw new SubmissionError(
      400,
      "Choose a valid category.",
    );
  }

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";

  if (
    title.length < 3 ||
    title.length > 120 ||
    description.length > 1000 ||
    body.consent !== true
  ) {
    throw new SubmissionError(
      400,
      "Enter a title (3–120 characters) and agree to submit your image for public sharing.",
    );
  }

  // ==========================================================
  // TURNSTILE VERIFICATION
  // ==========================================================

  if (
    typeof body.challenge !== "string" ||
    body.challenge.length > 2048 ||
    !(await deps.verify(body.challenge))
  ) {
    throw new SubmissionError(
      403,
      "Verification expired or failed. Please try again.",
    );
  }

  // ==========================================================
  // CHECK EXISTING SUBMISSION
  // ==========================================================

  const existing = await deps.find(hash);

  if (existing) {
    if (
      ["pending", "published"].includes(
        existing.status,
      )
    ) {
      return {
        id: existing.id,
        status: existing.status,
      };
    }

    throw new SubmissionError(
      409,
      "This submission is still processing or has been removed. Check your private management link.",
    );
  }

  // ==========================================================
  // REJECT LEGACY PNG UPLOADS
  // ==========================================================

  if (body.png !== undefined) {
    throw new SubmissionError(
      400,
      "Image uploads are no longer accepted. Refresh the editor and submit the scene.",
    );
  }

  // ==========================================================
  // RENDER SCENE
  // ==========================================================

  const {
    png,
    thumbnail,
    editableScene,
  } = await deps.render(body.scene);

  // ==========================================================
  // CREATE SUBMISSION
  // ==========================================================

  const id = randomUUID();

  const prefix = `submissions/${id}`;

  await deps.insert({
    id,

    slug: `scene-${id}`,

    title,

    description,

    category,

    management_token_hash: hash,

    private_object_prefix: prefix,

    sharing_consent_at:
      new Date().toISOString(),

    ...(editableScene
      ? {
          editable_scene: editableScene,
        }
      : {}),

    expires_at: new Date(
      Date.now() + 60 * 60 * 1000,
    ).toISOString(),
  });

  // ==========================================================
  // UPLOAD TO STORAGE
  // ==========================================================

  try {
    await deps.put(
      `${prefix}/image.png`,
      png,
      "image/png",
    );

    await deps.put(
      `${prefix}/thumbnail.webp`,
      thumbnail,
      "image/webp",
    );

    const transitioned = await deps.transition(
      id,
      ["uploading"],
      {
        status: "pending",

        image_bytes: png.length,

        image_width: 1200,

        image_height: 800,

        expires_at: null,
      },
    );

    if (!transitioned) {
      throw new Error(
        "Submission transition failed",
      );
    }
  } catch {
    // Preserve the submission receipt if the final
    // database update succeeded but its response was lost.

    const current = await deps
      .find(hash)
      .catch(() => null);

    if (current?.status === "pending") {
      return {
        id,
        status: "pending",
      };
    }

    if (
      current?.status === "uploading" &&
      (await deps
        .transition(
          id,
          ["uploading"],
          {
            status: "rejected",
          },
        )
        .catch(() => false))
    ) {
      await Promise.allSettled([
        deps.remove(
          `${prefix}/image.png`,
        ),

        deps.remove(
          `${prefix}/thumbnail.webp`,
        ),
      ]);
    }

    throw new SubmissionError(
      503,
      "The upload could not finish. Use your private management link to check its status or remove it.",
    );
  }

  return {
    id,
    status: "pending",
  };
}

// ============================================================
// MANAGE SUBMISSION
// ============================================================

export async function manage(
  request: Request,
  deps: SubmissionDependencies,
) {
  checkOrigin(
    request,
    deps.siteUrl,
  );

  const body = await readBody(
    request,
    2048,
  );

  const row = await deps.find(
    tokenHash(body.managementToken),
  );

  if (!row) {
    throw new SubmissionError(
      404,
      "No submission was found for this private link.",
    );
  }

  // ==========================================================
  // DELETE SUBMISSION
  // ==========================================================

  if (
    body.action === "delete" &&
    row.status !== "deleted"
  ) {
    if (
      row.status === "uploading" &&
      Date.now() -
        new Date(row.created_at).getTime() <
        10 * 60 * 1000
    ) {
      throw new SubmissionError(
        409,
        "Your upload is still processing. Try removing it in a few minutes.",
      );
    }

    const transitioned = await deps.transition(
      row.id,
      [row.status],
      {
        status: "deleting",
      },
    );

    if (!transitioned) {
      throw new SubmissionError(
        409,
        "The submission changed. Refresh its status and try again.",
      );
    }

    // Remove private image files.

    await deps.remove(
      `${row.private_object_prefix}/image.png`,
    );

    await deps.remove(
      `${row.private_object_prefix}/thumbnail.webp`,
    );

    // Remove published image files.

    if (row.public_image_key) {
      await deps.remove(
        row.public_image_key,
        true,
      );
    }

    if (row.public_thumbnail_key) {
      await deps.remove(
        row.public_thumbnail_key,
        true,
      );
    }

    // Mark submission as deleted.

    const deleted = await deps.transition(
      row.id,
      ["deleting"],
      {
        status: "deleted",

        editable_scene: null,

        deleted_at:
          new Date().toISOString(),
      },
    );

    if (!deleted) {
      throw new Error(
        "Deletion transition failed",
      );
    }

    row.status = "deleted";
  } else if (
    body.action !== "status" &&
    body.action !== "delete"
  ) {
    throw new SubmissionError(
      400,
      "Unknown management action.",
    );
  }

  return {
    id: row.id,

    title: row.title,

    status: row.status,

    createdAt: row.created_at,
  };
}

// ============================================================
// API RESPONSE
// ============================================================

export function submissionResponse(
  data: unknown,
  status = 200,
) {
  return Response.json(data, {
    status,

    headers: {
      "Cache-Control": "no-store",

      "Referrer-Policy": "no-referrer",

      "X-Robots-Tag":
        "noindex, nofollow",
    },
  });
}

// ============================================================
// API ERROR RESPONSE
// ============================================================

export function submissionFailure(
  error: unknown,
) {
  return submissionResponse(
    {
      error:
        error instanceof SubmissionError
          ? error.message
          : "The service is temporarily unavailable. Please try again.",
    },

    error instanceof SubmissionError
      ? error.status
      : 503,
  );
}