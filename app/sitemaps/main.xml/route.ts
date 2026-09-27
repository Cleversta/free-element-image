import { mainSitemap, sitemapHeaders } from "@/lib/sitemaps";
export const dynamic = "force-static";
export function GET() {
  return new Response(mainSitemap(), { headers: sitemapHeaders });
}
