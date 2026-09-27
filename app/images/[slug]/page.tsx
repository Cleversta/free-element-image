import { structuredData } from "@/lib/structured-data";
import Link from "next/link";
import ReportImage from "@/components/ReportImage";
import { notFound } from "next/navigation";
import { imagePageData } from "@/lib/server/gallery";
import { publishedScene } from "@/lib/server/editable-scene";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, "") ||
  "https://freelementimages.site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const image = await imagePageData(slug);

  if (!image) {
    return {
      title: "Image not found",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const encodedSlug = encodeURIComponent(slug);

  const pageUrl =
    `${SITE_URL}/images/${encodedSlug}`;

  const imageUrl =
    `${SITE_URL}/api/images/${encodedSlug}/image`;

  const description =
    image.description ||
    `View and download ${image.title}, a community-created scene made with Freelement Images.`;

  return {
    title: image.title,

    description,

    alternates: {
      canonical: pageUrl,
    },

    robots: {
      index: true,
      follow: true,

      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },

    openGraph: {
      title: image.title,
      description,
      url: pageUrl,
      siteName: "Freelement Images",
      type: "website",

      images: [
        {
          url: imageUrl,
          width: image.image_width,
          height: image.image_height,
          alt: image.title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: image.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ImagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const image = await imagePageData(slug);

  if (!image) {
    notFound();
  }

  const editable = !!(
    await publishedScene(slug).catch(() => null)
  );

  const encodedSlug = encodeURIComponent(slug);

  const pageUrl =
    `${SITE_URL}/images/${encodedSlug}`;

  const imageUrl =
    `${SITE_URL}/api/images/${encodedSlug}/image`;

  const description =
    image.description ||
    `Community-created scene made with Freelement Images.`;

  const imageSchema = {
    "@context": "https://schema.org",
    "@type": "ImageObject",

    name: image.title,
    caption: description,
    description,

    contentUrl: imageUrl,
    url: pageUrl,

    width: image.image_width,
    height: image.image_height,

    encodingFormat: "image/png",

    isPartOf: {
      "@type": "WebSite",
      name: "Freelement Images",
      url: SITE_URL,
    },
  };

  return (
    <main className="galleryPage imageDetail">
      {/* Image structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: structuredData(imageSchema),
        }}
      />

      <nav>
        <Link href="/gallery">
          ← Gallery
        </Link>

        <Link href="/create">
          Create your own
        </Link>
      </nav>

      <h1>{image.title}</h1>

      <img
        className="publicOriginal"
        src={`/api/images/${encodedSlug}/image`}
        alt={image.title}
        width={image.image_width}
        height={image.image_height}
      />

      {image.description && (
        <p className="imageDescription">
          {image.description}
        </p>
      )}

      <p>
        {image.image_width} × {image.image_height} · PNG
      </p>

      <a
        className="primary"
        href={`/api/images/${encodedSlug}/download`}
        download
      >
        Download PNG
      </a>

      {editable && (
        <p>
          <Link
            className="primary"
            href={`/create?scene=${encodedSlug}`}
          >
            Edit this image
          </Link>
        </p>
      )}

      <p className="usageNote">
        Shared for public display and download.{" "}

        {editable &&
          "You may also edit a copy in the editor. "}

        No broader reuse license is specified.
        Do not assume the artwork is public domain.
      </p>

      <p><Link href="/scenes">Explore starter landscapes</Link> · <Link href="/guides/your-first-landscape">Learn to make a scene</Link> · <Link href="/image-use">Image permissions</Link></p>
      <ReportImage slug={slug} />
    </main>
  );
}