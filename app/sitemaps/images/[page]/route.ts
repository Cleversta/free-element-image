import { createSupabaseAdmin } from "@/lib/server/clients";
import { SITEMAP_PAGE_SIZE, sitemapHeaders, urlset } from "@/lib/sitemaps";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params;
  if (!/^(0|[1-9]\d{0,4})\.xml$/.test(page))
    return new Response("Not found", { status: 404 });
  const index = Number(page.slice(0, -4));
  try {
    const { data, error } = await createSupabaseAdmin()
      .from("images")
      .select("public_slug,published_at")
      .eq("status", "published")
      .order("id")
      .range(index * SITEMAP_PAGE_SIZE, (index + 1) * SITEMAP_PAGE_SIZE - 1);
    if (error) throw error;
    return new Response(
      urlset(
        (data || []).map((row) => ({
          path: `/images/${encodeURIComponent(row.public_slug)}`,
          image: `/api/images/${encodeURIComponent(row.public_slug)}/image`,
          modified: row.published_at,
        })),
      ),
      { headers: sitemapHeaders },
    );
  } catch {
    return new Response("Sitemap temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "300" },
    });
  }
}
