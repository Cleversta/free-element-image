import "server-only";
import { createSupabaseAdmin } from "./clients.ts";

// The service key bypasses RLS, so always restrict this read to published rows.
export async function publishedScene(slug: string): Promise<string | null> {
  if (!/^scene-[a-f0-9-]{36}$/.test(slug)) return null;
  const { data, error } = await createSupabaseAdmin()
    .from("images")
    .select("editable_scene")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Editable scene unavailable");
  return data?.editable_scene || null;
}
