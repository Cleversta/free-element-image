import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, "") ||
  "https://freelementimages.site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",

      allow: "/",

      disallow: [
        "/admin",
        "/manage",
        "/api/admin/",
        "/api/submissions/",
        "/api/publish",
      ],
    },

    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}