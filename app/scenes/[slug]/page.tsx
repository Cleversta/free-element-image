import Link from "next/link";
import { notFound } from "next/navigation";
import InformationPage from "@/components/InformationPage";
import { starterScene, starterScenes } from "@/lib/starter-scenes";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { structuredData } from "@/lib/structured-data";

export const dynamicParams = false;
export function generateStaticParams() {
  return starterScenes.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scene = starterScene(slug);
  if (!scene) notFound();
  const metadata = pageMetadata(
    `${scene.background.name} — Editable Landscape`,
    scene.background.description!,
    `/scenes/${slug}`,
  );
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [
        {
          url: `/starter-downloads/${slug}.png`,
          width: 1200,
          height: 800,
          alt: scene.background.description,
        },
      ],
    },
    twitter: {
      ...metadata.twitter,
      images: [`/starter-downloads/${slug}.png`],
    },
  };
}
export default async function ScenePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scene = starterScene(slug);
  if (!scene) notFound();
  const index = starterScenes.indexOf(scene);
  const next = starterScenes[(index + 1) % starterScenes.length];
  return (
    <InformationPage title={scene.background.name}>
      <p>
        <Link href="/scenes">All starter scenes</Link> · Original project
        background
      </p>
      <p className="introText">{scene.background.description}</p>
      <img
        className="guideImage"
        src={`/starter-downloads/${slug}.png`}
        alt={scene.background.description}
        width={1200}
        height={800}
        fetchPriority="high"
      />
      <div className="publishButtons">
        <Link className="primary" href={`/create?template=${slug}`}>
          Edit this starter scene
        </Link>
        <a href={`/starter-downloads/${slug}.png`} download>
          Download PNG · 1200 × 800
        </a>
      </div>
      <h2>{scene.heading}</h2>
      <p>{scene.composition}</p>
      <h2>A small exercise</h2>
      <p>{scene.exercise}</p>
      <h2>Make it your own</h2>
      <p>
        The landscape is a single background image. Open it in the editor to add
        movable trees, buildings, animals, and other details. Opening this
        starter does not replace your browser save until you choose Save.
      </p>
      <p>
        New here? Follow{" "}
        <Link href="/guides/your-first-landscape">
          the first-landscape guide
        </Link>
        , or learn about{" "}
        <Link href="/guides/layers-sizing-and-locking">
          layers and resizing
        </Link>
        .
      </p>
      <p className="usageNote">
        Created for Freelement Images. Available for display, download, and
        editing here. Check <Link href="/image-use">image-use information</Link>{" "}
        before broader reuse, especially after adding artwork from other
        sources.
      </p>
      <p>
        Try another setting:{" "}
        <Link href={`/scenes/${next.slug}`}>{next.background.name}</Link>.
      </p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: structuredData({
            "@context": "https://schema.org",
            "@type": "ImageObject",
            name: scene.background.name,
            description: scene.background.description,
            contentUrl: `${SITE_URL}/starter-downloads/${slug}.png`,
            url: `${SITE_URL}/scenes/${slug}`,
            width: 1200,
            height: 800,
            creator: { "@type": "Organization", name: "Freelement Images" },
            encodingFormat: "image/png",
          }),
        }}
      />
    </InformationPage>
  );
}
