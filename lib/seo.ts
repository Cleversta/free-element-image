import type { Metadata } from "next";

export const SITE_URL = (
  process.env.SITE_URL || "https://freelementimages.site"
).replace(/\/$/, "");
export const BRAND = "Freelement Images";

export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      siteName: BRAND,
      type: "website",
      images: [
        {
          url: "/social-preview.jpg",
          width: 1200,
          height: 630,
          alt: "An illustrated alpine lake landscape created with Freelement Images",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/social-preview.jpg"],
    },
  };
}

export function galleryMetadata(
  page: number,
  q: string,
  category: string,
): Metadata {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const path = `/gallery${params.size ? `?${params}` : ""}`;
  return {
    ...pageMetadata(
      `Community Scene Gallery${page > 1 ? ` — Page ${page}` : ""}`,
      "Explore community-created landscapes, download a PNG, or open an editable scene to make it your own.",
      path,
    ),
    // Internal searches are useful to visitors but not standalone landing pages.
    robots: { index: !q && !category, follow: true },
  };
}
