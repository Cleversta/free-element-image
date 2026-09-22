import "server-only";
import { createClient } from "@supabase/supabase-js";
import { S3Client } from "@aws-sdk/client-s3";
import { readR2Config, readSupabaseConfig } from "./config.ts";

// Lazy clients: creating/editing/downloading never requires cloud credentials.
export function createSupabaseAdmin() {
  const { url, secretKey } = readSupabaseConfig();
  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  });
}

export function createR2Client() {
  const { accountId, accessKeyId, secretAccessKey } = readR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 2,
  });
}
