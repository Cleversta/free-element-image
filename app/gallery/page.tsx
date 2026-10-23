import SiteHeader from "@/components/SiteHeader";
import { galleryMetadata } from "@/lib/seo";
import {
  galleryFilters,
  gallerySort,
  galleryPageHref,
  sceneCategories,
} from "@/lib/gallery-filters";
import Link from "next/link";
import { listPublished } from "@/lib/server/gallery";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    category?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const { q, category } = galleryFilters(params.q, params.category);
  const sort = gallerySort(params.sort);
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.page) || 1)),
  );
  return galleryMetadata(page, q, category, sort);
}
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    category?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const { q, category } = galleryFilters(params.q, params.category);
  const sort = gallerySort(params.sort);
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(params.page) || 1)),
  );
  let result: Awaited<ReturnType<typeof listPublished>> | null = null;
  try {
    result = await listPublished(page, 24, q, category, sort);
  } catch (error) {
    console.error("Gallery listing failed:", error);
  }
  return (
    <main className="galleryPage">
      <SiteHeader active="gallery" />
      <h1>Made by the community</h1>
      <p>
        Explore approved scenes. Create your own, or download an image you like.
      </p>
      <form
        key={JSON.stringify([q, category, sort])}
        action="/gallery"
        className="galleryFilters"
        role="search"
      >
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
        <label>
          Sort by
          <select aria-label="Sort by" name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <button type="submit" className="primary">
          Search
        </button>
        {(q || category || sort === "oldest") && (
          <Link href="/gallery">Clear filters</Link>
        )}
      </form>
      {!result ? (
        <section className="galleryEmpty" role="status">
          <h2>The gallery is temporarily unavailable</h2>
          <p>
            Please try again. You can still create and download your own scene.
          </p>
          <a
            className="primary"
            href={galleryPageHref(page, q, category, sort)}
          >
            Try again
          </a>
          <p>
            <Link href="/create">Create a scene →</Link>
          </p>
        </section>
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
              <p>
                Looking for inspiration?{" "}
                <Link href="/scenes">Explore the starter landscapes.</Link>
              </p>
            </section>
          )}
          <div className="publicGrid">
            {result.images.map((image) => (
              <article key={image.slug}>
                <Link href={`/images/${image.public_slug}`}>
                  <img
                    src={`/api/images/${image.slug}/thumbnail`}
                    alt={image.title}
                    width="480"
                    height="320"
                    loading="lazy"
                    decoding="async"
                  />
                  <h2>{image.title}</h2>
                </Link>
                {sceneCategories.some((value) => value === image.category) && (
                  <p className="galleryCategory">
                    <Link href={galleryPageHref(1, "", image.category)}>
                      <span className="srOnly">Browse category: </span>
                      {image.category[0].toUpperCase() +
                        image.category.slice(1)}
                    </Link>
                  </p>
                )}
              </article>
            ))}
          </div>
          <nav className="publishButtons" aria-label="Gallery pages">
            {page > 1 && (
              <Link href={galleryPageHref(page - 1, q, category, sort)}>
                ← Previous
              </Link>
            )}
            <span aria-current="page">Page {page}</span>
            {result.more && (
              <Link href={galleryPageHref(page + 1, q, category, sort)}>
                Next →
              </Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
