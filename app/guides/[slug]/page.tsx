import Link from "next/link";
import { notFound } from "next/navigation";
import InformationPage from "@/components/InformationPage";
import { guides } from "@/lib/guides";
import { starterScene } from "@/lib/starter-scenes";
import { pageMetadata } from "@/lib/seo";
export const dynamicParams = false;
export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) notFound();
  return pageMetadata(guide.title, guide.description, `/guides/${slug}`);
}
export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) notFound();
  const scene = starterScene(guide.scene)!;
  return (
    <InformationPage title={guide.title}>
      <p>
        <Link href="/guides">All guides</Link> · About {guide.minutes} minutes ·
        Freelement Images
      </p>
      <p className="introText">{guide.description}</p>
      <figure className="guideFigure">
        <img
          className="guideImage"
          src={`/starter-previews/${guide.scene}.webp`}
          width={600}
          height={400}
          alt={scene.background.description}
        />
        <figcaption>
          Practice with{" "}
          <Link href={`/scenes/${guide.scene}`}>{scene.background.name}</Link>.
        </figcaption>
      </figure>
      <nav className="guideContents" aria-label="On this page">
        {guide.sections.map((s, i) => (
          <a key={s.title} href={`#step-${i + 1}`}>
            {i + 1}. {s.title}
          </a>
        ))}
      </nav>
      {guide.sections.map((section, i) => (
        <section id={`step-${i + 1}`} key={section.title}>
          <h2>
            {i + 1}. {section.title}
          </h2>
          {section.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
      <div className="guideNext">
        <h2>Try it in the editor</h2>
        <p>
          Start with the example background, then change one thing at a time.
        </p>
        <Link className="primary" href={`/create?template=${guide.scene}`}>
          Open the practice scene
        </Link>
      </div>
      <h2>Keep learning</h2>
      <ul>
        {guides
          .filter((g) => g.slug !== slug)
          .map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`}>{g.title}</Link>
            </li>
          ))}
      </ul>
      <p>
        <Link href="/image-use">Image permissions</Link> ·{" "}
        <Link href="/contact">Get help</Link>
      </p>
    </InformationPage>
  );
}
