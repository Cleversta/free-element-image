import Link from "next/link";
import { listPublished } from "@/lib/server/gallery";
export default async function HomePublicImages() {
  let result: Awaited<ReturnType<typeof listPublished>>;
  try {
    result = await listPublished(1, 6);
  } catch {
    return (
      <p role="status">
        Public images are temporarily unavailable. You can still create and
        download your own scene.
      </p>
    );
  }
  if (!result.images.length)
    return (
      <div className="galleryEmpty">
        <h3>Be the first to share a scene</h3>
        <p>Published images will appear here.</p>
        <Link href="/create">Create a scene →</Link>
      </div>
    );
  return (
    <div className="publicGrid">
      {result.images.map((image) => (
        <article key={image.slug}>
          <Link href={`/images/${image.slug}`}>
            <img
              src={`/api/images/${image.slug}/thumbnail`}
              alt={image.title}
              width="480"
              height="320"
              loading="lazy"
            />
            <h3>{image.title}</h3>
          </Link>
        </article>
      ))}
    </div>
  );
}
