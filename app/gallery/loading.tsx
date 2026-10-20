import SiteHeader from "@/components/SiteHeader";

export default function GalleryLoading() {
  return (
    <main className="galleryPage" aria-busy="true">
      <SiteHeader active="gallery" />
      <h1>Made by the community</h1>
      <p role="status">Loading community scenes…</p>
      <div className="publicGrid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <article key={index} className="gallerySkeletonCard">
            <div className="gallerySkeletonImage" />
            <div className="gallerySkeletonTitle" />
          </article>
        ))}
      </div>
    </main>
  );
}
