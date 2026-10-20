import { starterScene } from "@/lib/starter-scenes";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import Generator from "@/components/Generator";
import { publishedScene } from "@/lib/server/editable-scene";
import Link from "next/link";

export const metadata = pageMetadata(
  "Free Online Scene Creator",
  "Build a landscape with illustrated backgrounds, trees, buildings and animals. Move, layer and download your picture without signing up.",
  "/create",
);

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{
    scene?: string;
    template?: string;
    project?: string;
    creations?: string;
    mode?: string;
  }>;
}) {
  const { scene, template, project, creations, mode } = await searchParams;
  if (project) return <Generator key={project} projectId={project} />;
  if (template && !scene && mode !== "photo") {
    const starter = starterScene(template);
    if (!starter) notFound();
    return (
      <Generator
        entryType="starter"
        sharedScene={JSON.stringify({
          version: 2,
          baseBg: starter.background,
          items: [],
        })}
      />
    );
  }
  if (!scene)
    return (
      <Generator
        key={mode || "scene"}
        photoMode={mode === "photo"}
        openCreations={creations === "1"}
      />
    );
  const sharedScene = await publishedScene(scene).catch(() => null);
  if (!sharedScene)
    return (
      <main className="galleryPage">
        <h1>This scene is not available to edit</h1>
        <p>It may be an older image or no longer public.</p>
        <Link href="/create">Create a new scene</Link>
      </main>
    );
  return <Generator sharedScene={sharedScene} />;
}
