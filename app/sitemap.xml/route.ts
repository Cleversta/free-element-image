import { createSupabaseAdmin } from "@/lib/server/clients";
import { sitemapIndex, sitemapHeaders } from "@/lib/sitemaps";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { count, error } = await createSupabaseAdmin()
      .from("images")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    if (error) throw error;
    return new Response(sitemapIndex(count || 0), { headers: sitemapHeaders });
  } catch {
    // The static content sitemap remains discoverable during backend outages.
    // A short cache allows the complete index to recover quickly.
    console.error(
      "Image sitemap count unavailable; returning the static index fallback.",
    );
    return new Response(sitemapIndex(0), {
      headers: { ...sitemapHeaders, "Cache-Control": "no-store" },
    });
  }
}
