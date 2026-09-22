import Link from "next/link";
import { listPublished } from "@/lib/server/gallery";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Community image gallery | Freelement Images",
  description:
    "Browse scenes shared by the Freelement community and download your favorites.",
};
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.page) || 1)),
  );
  let result: Awaited<ReturnType<typeof listPublished>> | null = null;
  try {
    result = await listPublished(page);
  } catch {
    /* Keep the editor available when the gallery is offline. */
  }
  return (
    <main className="galleryPage">
      <nav>
        <Link href="/">Freelement Images</Link>
        <Link href="/create">Create a scene</Link>
      </nav>
      <h1>Made by the community</h1>
      <p>
        Explore approved scenes. Create your own, or download an image you like.
      </p>
      {!result ? (
        <p role="status">
          The gallery is temporarily unavailable. Please try again shortly.
        </p>
      ) : (
        <>
          {result.images.length === 0 && (
            <section className="galleryEmpty">
              <h2>
                {page === 1
                  ? "The gallery is waiting for its first scene"
                  : "No more images"}
              </h2>
              <p>Images appear here after owner review.</p>
              <Link href="/create">Create a scene →</Link>
            </section>
          )}
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
                  <h2>{image.title}</h2>
                </Link>
              </article>
            ))}
          </div>
          <nav className="publishButtons" aria-label="Gallery pages">
            {page > 1 && (
              <Link href={`/gallery?page=${page - 1}`}>← Previous</Link>
            )}
            {result.more && (
              <Link href={`/gallery?page=${page + 1}`}>Next →</Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
