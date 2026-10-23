import SiteHeader from "@/components/SiteHeader";
import HomeCreations from "@/components/HomeCreations";
import { starterScenes } from "@/lib/starter-scenes";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Suspense } from "react";
import HomePublicImages from "@/components/HomePublicImages";
export const metadata = pageMetadata(
  "Free Online Image Creator and Photo Editor",
  "Create illustrated scenes or edit your own photo with Freelement Images. Choose a background, arrange visual elements, crop and adjust photos, then download your image for free.",
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
      <section className="homeDetails" aria-labelledby="creator-details-title">
        <div className="homeDetailsIntro">
          <h2 id="creator-details-title">
            Free online image creator and photo editor
          </h2>
          <p>
            Use this free online image maker to create illustrated landscapes
            from backgrounds and visual elements. The scene builder lets you
            choose and arrange the details yourself, while the online photo
            editor lets you crop and customize your own picture. Start with a
            ready-made scene or a simple background, then download your image
            without signing up.
          </p>
        </div>
        <div className="homeDetailsGrid">
          <article>
            <h3>Create a scene from a background</h3>
            <p>
              Browse illustrated scene backgrounds, open landscapes, skies, and
              color gradients. Add visual elements such as trees, flowers,
              buildings, animals, and other decorations. Move, resize, rotate,
              and layer each element until the composition feels right.
            </p>
            <Link href="/create">Open the free scene creator →</Link>
          </article>
          <article>
            <h3>Edit a photo in your browser</h3>
            <p>
              Bring in your own JPG, PNG, or WebP photo. Crop and reposition it,
              adjust its appearance, and add text or illustrated details. Your
              photo becomes the background for a design you can continue to
              customize.
            </p>
            <Link href="/create?mode=photo">Open the photo editor →</Link>
          </article>
          <article>
            <h3>Download or explore more ideas</h3>
            <p>
              Export your finished creation as an image, or save your work in
              this browser and return to it later on the same device. Browse
              the public gallery for community creations, or follow a beginner
              guide to learn the editor one step at a time.
            </p>
            <Link href="/guides">Read the creation guides →</Link>
          </article>
        </div>
        <p className="homeDetailsNote">
          Freelement Images is a hands-on visual editor: you choose and arrange
          the scene yourself. Read the <Link href="/image-use">image use information</Link>
          before reusing artwork from the gallery.
        </p>
      </section>
    </main>
  );
}
