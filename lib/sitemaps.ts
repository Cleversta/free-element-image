import { SITE_URL } from "./seo.ts";
import { starterScenes } from "./starter-scenes.ts";
import { guides } from "./guides.ts";

export const SITEMAP_PAGE_SIZE = 1000;
export const sitemapHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=300, must-revalidate",
};
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
export function sitemapIndex(count: number) {
  const pages = Math.max(1, Math.ceil(count / SITEMAP_PAGE_SIZE));
  const urls = [
    `${SITE_URL}/sitemaps/main.xml`,
    ...Array.from(
      { length: pages },
      (_, i) => `${SITE_URL}/sitemaps/images/${i}.xml`,
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<sitemap><loc>${xmlEscape(url)}</loc></sitemap>`).join("")}</sitemapindex>`;
}
export function urlset(
  rows: { path: string; image?: string; modified?: string | null }[],
) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${rows
    .map((row) => {
      const date = row.modified ? new Date(row.modified) : null;
      return `<url><loc>${xmlEscape(`${SITE_URL}${row.path}`)}</loc>${date && Number.isFinite(date.getTime()) ? `<lastmod>${date.toISOString()}</lastmod>` : ""}${row.image ? `<image:image><image:loc>${xmlEscape(`${SITE_URL}${row.image}`)}</image:loc></image:image>` : ""}</url>`;
    })
    .join("")}</urlset>`;
}
export function mainSitemap() {
  return urlset([
    ...[
      "/",
      "/create",
      "/gallery",
      "/about",
      "/contact",
      "/privacy",
      "/terms",
      "/image-use",
      "/scenes",
      "/guides",
    ].map((path) => ({ path })),
    ...starterScenes.map((scene) => ({
      path: `/scenes/${scene.slug}`,
      image: `/starter-downloads/${scene.slug}.png`,
    })),
    ...guides.map((guide) => ({ path: `/guides/${guide.slug}` })),
  ]);
}
