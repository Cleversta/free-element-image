import "server-only";

export type BackendEnvironment = Record<string, string | undefined>;

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function required(env: BackendEnvironment, name: string): string {
  const value = env[name]?.trim();
  if (!value)
    throw new ConfigurationError(
      `Missing ${name}. Set it in .env.local or Netlify environment variables.`,
    );
  return value;
}

function httpsOrigin(value: string, name: string): string {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new ConfigurationError(
      `${name} must be an HTTPS origin with no path, query, or credentials.`,
    );
  }
}

export function readSupabaseConfig(env: BackendEnvironment = process.env) {
  const url = httpsOrigin(required(env, "SUPABASE_URL"), "SUPABASE_URL");
  const secretKey = required(env, "SUPABASE_SECRET_KEY");
  if (!secretKey.startsWith("sb_secret_")) {
    throw new ConfigurationError(
      "SUPABASE_SECRET_KEY must be a backend secret key (sb_secret_...), not a publishable or legacy key.",
    );
  }
  return { url, secretKey };
}

export function readR2Config(env: BackendEnvironment = process.env) {
  const accountId = required(env, "R2_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/i.test(accountId))
    throw new ConfigurationError(
      "R2_ACCOUNT_ID must be the 32-character Cloudflare account ID.",
    );
  const accessKeyId = required(env, "R2_ACCESS_KEY_ID");
  const secretAccessKey = required(env, "R2_SECRET_ACCESS_KEY");
  const privateBucket = required(env, "R2_PRIVATE_BUCKET");
  const publicBucket = required(env, "R2_PUBLIC_BUCKET");
  const bucketPattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
  if (!bucketPattern.test(privateBucket) || !bucketPattern.test(publicBucket))
    throw new ConfigurationError(
      "R2 bucket names must use 3–63 lowercase letters, numbers, or hyphens.",
    );
  if (privateBucket === publicBucket)
    throw new ConfigurationError(
      "Private submissions and public images must use different R2 buckets.",
    );
  const publicBaseUrl = env.R2_PUBLIC_BASE_URL?.trim()
    ? httpsOrigin(env.R2_PUBLIC_BASE_URL.trim(), "R2_PUBLIC_BASE_URL")
    : undefined;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    privateBucket,
    publicBucket,
    publicBaseUrl,
  };
}
