import Link from "next/link";
import InformationPage from "@/components/InformationPage";
import { starterScenes } from "@/lib/starter-scenes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Landscape Starter Scenes",
  "Choose from 12 illustrated landscapes, learn a composition tip, and open a scene in the free editor.",
  "/scenes",
);
export default function ScenesPage() {
  return (
    <InformationPage title="A place to start">
      <p className="introText">
        Twelve landscapes, ready for your next idea. Choose a scene, try its
        composition exercise, and add your own objects. No account needed.
      </p>
      <p>
        These are project-created starter backgrounds, separate from community
        submissions. The background is one image; objects you add can be moved
        independently.
      </p>
      <div className="contentGrid">
        {starterScenes.map((scene) => (
          <article key={scene.slug}>
            <Link href={`/scenes/${scene.slug}`}>
              <img
                src={`/starter-previews/${scene.slug}.webp`}
                width={600}
                height={400}
                alt={scene.background.description}
                loading="lazy"
              />
              <h2>{scene.background.name}</h2>
            </Link>
            <p>{scene.background.description}</p>
          </article>
        ))}
      </div>
      <p>
        New to the editor?{" "}
        <Link href="/guides/your-first-landscape">
          Make your first landscape step by step.
        </Link>
      </p>
    </InformationPage>
  );
}
