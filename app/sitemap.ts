import type { MetadataRoute } from "next";
import { createSupabaseAdmin } from "@/lib/server/clients";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.SITE_URL || "http://localhost:3000";
  const entries: MetadataRoute.Sitemap = [
    { url: origin },
    { url: `${origin}/create` },
    { url: `${origin}/gallery` },
  ];
  // Start with the latest 1000 public images. Split into sitemap files as the catalog grows.
  const { data, error } = await createSupabaseAdmin()
    .from("images")
    .select("slug,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error("Sitemap unavailable");
  return entries.concat(
    (data || []).map((row) => ({
      url: `${origin}/images/${row.slug}`,
      lastModified: row.published_at,
      images: [`${origin}/api/images/${row.slug}/image`],
    })),
  );
}
