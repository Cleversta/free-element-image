import {
  galleryFilters,
  galleryPageHref,
  sceneCategories,
} from "@/lib/gallery-filters";
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
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const { q, category } = galleryFilters(params.q, params.category);
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.page) || 1)),
  );
  let result: Awaited<ReturnType<typeof listPublished>> | null = null;
  try {
    result = await listPublished(page, 24, q, category);
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
      <form action="/gallery" className="galleryFilters" role="search">
        <label>
          Search titles
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Try sunset or mountains"
          />
        </label>
        <label>
          Category
          <select aria-label="Category" name="category" defaultValue={category}>
            <option value="">All categories</option>
            {sceneCategories.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary">
          Search
        </button>
        {(q || category) && <Link href="/gallery">Clear filters</Link>}
      </form>
      {!result ? (
        <p role="status">
          The gallery is temporarily unavailable. Please try again shortly.
        </p>
      ) : (
        <>
          {result.images.length === 0 && (
            <section className="galleryEmpty">
              <h2>
                {q || category
                  ? "No matching images"
                  : page === 1
                    ? "The gallery is waiting for its first scene"
                    : "No more images"}
              </h2>
              <p>
                {q || category
                  ? "Try another title or category, or clear the filters."
                  : "Images appear here after owner review."}
              </p>
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
              <Link href={galleryPageHref(page - 1, q, category)}>
                ← Previous
              </Link>
            )}
            {result.more && (
              <Link href={galleryPageHref(page + 1, q, category)}>Next →</Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
