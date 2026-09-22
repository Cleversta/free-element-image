import Link from "next/link";
import ReportImage from "@/components/ReportImage";
import { notFound } from "next/navigation";
import { publicImage } from "@/lib/server/gallery";
import { publishedScene } from "@/lib/server/editable-scene";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const image = await publicImage(slug);
  if (!image) return { title: "Image not found", robots: { index: false } };
  const origin = process.env.SITE_URL || "http://localhost:3000";
  return {
    title: `${image.title} | Freelement Images`,
    description:
      image.description ||
      `View and download ${image.title}, a community scene made with Freelement Images.`,
    alternates: { canonical: `${origin}/images/${slug}` },
    openGraph: {
      title: image.title,
      images: [
        {
          url: `${origin}/api/images/${slug}/image`,
          width: image.image_width,
          height: image.image_height,
          alt: image.title,
        },
      ],
    },
  };
}
export default async function ImagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const image = await publicImage(slug);
  if (!image) notFound();
  const editable = !!(await publishedScene(slug).catch(() => null));
  return (
    <main className="galleryPage imageDetail">
      <nav>
        <Link href="/gallery">← Gallery</Link>
        <Link href="/create">Create your own</Link>
      </nav>
      <h1>{image.title}</h1>
      <img
        className="publicOriginal"
        src={`/api/images/${slug}/image`}
        alt={image.title}
        width={image.image_width}
        height={image.image_height}
      />
      <p className="imageDescription">{image.description}</p>
      <p>
        {image.image_width} × {image.image_height} · PNG
      </p>
      <a className="primary" href={`/api/images/${slug}/download`} download>
        Download PNG
      </a>
      {editable && (
        <p>
          <Link className="primary" href={`/create?scene=${slug}`}>
            Edit this image
          </Link>
        </p>
      )}
      <p className="usageNote">
        Shared for public display and download.{" "}
        {editable && "You may also edit a copy in the editor. "}No broader reuse
        license is specified. Do not assume the artwork is public domain.
      </p>
      <ReportImage slug={slug} />
    </main>
  );
}
