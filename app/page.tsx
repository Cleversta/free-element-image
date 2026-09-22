import Link from "next/link";
import { Suspense } from "react";
import HomePublicImages from "@/components/HomePublicImages";
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <main className="home">
      <nav>
        <b>Freelement Images</b>
        <Link href="/create">Create</Link>
        <Link href="/gallery">Gallery</Link>
      </nav>
      <section className="hero">
        <span className="pill">NO PROMPTS • INSTANT • EDITABLE</span>
        <h1>
          Build an image from
          <br />
          <em>visual elements.</em>
        </h1>
        <p>
          Pick what you want. We compose a countryside scene instantly, then you
          can move, resize, rotate, lock and download it.
        </p>
        <Link className="primary" href="/create">
          Start creating →
        </Link>
      </section>
      <section
        className="homePublicImages"
        aria-labelledby="public-images-title"
      >
        <div className="homeGalleryHeading">
          <div>
            <h2 id="public-images-title">Latest public images</h2>
            <p>
              Scenes shared by the community. Find one you love and download it.
            </p>
          </div>
          <Link href="/gallery">Browse all images →</Link>
        </div>
        <Suspense fallback={<p role="status">Loading public images…</p>}>
          <HomePublicImages />
        </Suspense>
      </section>
      <section className="features">
        <article>
          <b>01</b>
          <h3>Choose elements</h3>
          <p>Trees, buildings, animals, water, sky and details.</p>
        </article>
        <article>
          <b>02</b>
          <h3>Generate instantly</h3>
          <p>Placement rules make random combinations feel intentional.</p>
        </article>
        <article>
          <b>03</b>
          <h3>Make it yours</h3>
          <p>Drag pieces around, resize them, regenerate, then export.</p>
        </article>
      </section>
    </main>
  );
}
