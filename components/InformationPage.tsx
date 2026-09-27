import Link from "next/link";
export default function InformationPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="informationPage">
      <nav aria-label="Main navigation">
        <Link href="/">Freelement Images</Link>
        <Link href="/create">Create</Link>
        <Link href="/gallery">Gallery</Link>
        <Link href="/scenes">Starter scenes</Link>
        <Link href="/guides">Guides</Link>
      </nav>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
