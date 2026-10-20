import SiteHeader from "@/components/SiteHeader";
import HomeCreations from "@/components/HomeCreations";
import { starterScenes } from "@/lib/starter-scenes";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Suspense } from "react";
import HomePublicImages from "@/components/HomePublicImages";
export const metadata = pageMetadata(
  "Free Online Landscape & Scene Creator",
  "Create a landscape from illustrated backgrounds and objects. Arrange, resize and download your scene for free, without an account.",
  "/",
);
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <main className="home">
      <SiteHeader />
      <HomeCreations />
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
        <div className="homeEditorChoices">
          <Link className="primary" href="/create">
            Start creating →
            <small>Create a scene with trees, houses, and more</small>
          </Link>
          <Link className="photoEditorChoice" href="/create?mode=photo">
            Edit a photo →
            <small>Crop, adjust colors, and add your own details</small>
          </Link>
        </div>
      </section>
      <section className="homePublicImages" aria-labelledby="starter-title">
        <div className="homeGalleryHeading">
          <div>
            <h2 id="starter-title">Start with a landscape you love</h2>
            <p>Open a ready-made background and add your own details.</p>
          </div>
          <Link href="/scenes">All starter scenes →</Link>
        </div>
        <div className="contentGrid">
          {starterScenes.slice(0, 3).map((scene) => (
            <article key={scene.slug}>
              <Link href={`/scenes/${scene.slug}`}>
                <img
                  src={`/starter-previews/${scene.slug}.webp`}
                  width={600}
                  height={400}
                  alt={scene.background.description}
                  loading="lazy"
                />
                <h3>{scene.background.name}</h3>
              </Link>
              <p>{scene.background.description}</p>
              <Link
                className="starterSceneAction"
                href={`/create?template=${scene.slug}`}
              >
                Customize this scene →
              </Link>
            </article>
          ))}
        </div>
        <p>
          First time here?{" "}
          <Link href="/guides/your-first-landscape">
            Follow the five-minute beginner guide.
          </Link>
        </p>
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
