import Link from "next/link";
export default function SiteFooter() {
  return (
    <footer className="siteFooter">
      <span>Freelement Images</span>
      <nav aria-label="Website information">
        <Link href="/scenes">Starter scenes</Link>
        <Link href="/guides">Guides</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/image-use">Image use</Link>
      </nav>
    </footer>
  );
}
