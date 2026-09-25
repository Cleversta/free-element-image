import type { MetadataRoute } from "next";
import { createSupabaseAdmin } from "@/lib/server/clients";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, "") ||
  "https://freelementimages.site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },

    {
      url: `${SITE_URL}/create`,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    {
      url: `${SITE_URL}/gallery`,
      changeFrequency: "daily",
      priority: 0.9,
    },

    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },

    {
      url: `${SITE_URL}/contact`,
      changeFrequency: "monthly",
      priority: 0.4,
    },

    {
      url: `${SITE_URL}/image-use`,
      changeFrequency: "monthly",
      priority: 0.5,
    },

    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2,
    },

    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const { data, error } = await createSupabaseAdmin()
    .from("images")
    .select("slug,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error(
      "Failed to generate image sitemap:",
      error.message
    );

    // Keep static pages available even if Supabase
    // temporarily fails.
    return staticPages;
  }

  const imagePages: MetadataRoute.Sitemap = (data || []).map(
    (row) => {
      const encodedSlug = encodeURIComponent(row.slug);

      return {
        url: `${SITE_URL}/images/${encodedSlug}`,

        lastModified: row.published_at
          ? new Date(row.published_at)
          : undefined,

        changeFrequency: "monthly",
        priority: 0.7,

        images: [
          `${SITE_URL}/api/images/${encodedSlug}/image`,
        ],
      };
    }
  );

  return [...staticPages, ...imagePages];
}