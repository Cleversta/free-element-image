import Link from "next/link";

export default function SiteHeader({ active }: { active?: "gallery" }) {
  return (
    <nav className="siteHeader" aria-label="Main navigation">
      <Link href="/" className="brandWrap" aria-label="Freelement Images home">
        <img
          src="/logo.png"
          alt=""
          className="brandLogo"
          width={42}
          height={42}
        />
        <b>Freelement Images</b>
      </Link>
      <div className="headerLinks">
        <Link href="/#my-creations">My creations</Link>
        <Link href="/create">Create</Link>
        <Link
          href="/gallery"
          aria-current={active === "gallery" ? "page" : undefined}
        >
          Gallery
        </Link>
        <Link href="/scenes">Starter scenes</Link>
        <Link href="/guides">Guides</Link>
      </div>
    </nav>
  );
}
