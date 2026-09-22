import Generator from "@/components/Generator";
import { publishedScene } from "@/lib/server/editable-scene";
import Link from "next/link";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  const { scene } = await searchParams;
  if (!scene) return <Generator />;
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
