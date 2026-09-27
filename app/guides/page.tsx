import Link from "next/link";
import InformationPage from "@/components/InformationPage";
import { guides } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Scene Creation Guides for Beginners",
  "Learn to create landscapes, arrange objects, download pictures, and safely share your scenes with these practical beginner guides.",
  "/guides",
);
export default function GuidesPage() {
  return (
    <InformationPage title="Make something you like">
      <p className="introText">
        Short, practical guides for your first scenes. Start simple, try one
        change at a time, and keep a copy of the result.
      </p>
      <div className="contentGrid">
        {guides.map((guide) => (
          <article key={guide.slug}>
            <Link href={`/guides/${guide.slug}`}>
              <img
                src={`/starter-previews/${guide.scene}.webp`}
                width={600}
                height={400}
                alt=""
                loading="lazy"
              />
              <h2>{guide.title}</h2>
            </Link>
            <p>{guide.description}</p>
            <p className="usageNote">About {guide.minutes} minutes</p>
          </article>
        ))}
      </div>
    </InformationPage>
  );
}
