import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import InformationPage from "@/components/InformationPage";
export const metadata = pageMetadata(
  "About",
  "Create scenes with visual elements, download them for free, and optionally share them with the community.",
  "/about",
);
export default function About() {
  return (
    <InformationPage title="About Freelement Images">
      <p>
        Freelement Images is a scene editor for building pictures from
        backgrounds and visual elements. Choose a landscape, arrange trees,
        buildings, and other details, then download your composition as a PNG.
      </p>
      <h2>Create without an account</h2>
      <p>
        Editing and downloading are free. You can save a scene in your browser
        and return to it on the same device. You do not need to register.
      </p>
      <h2>Share when you choose</h2>
      <p>
        Publishing is optional. Every submission waits for owner review before
        it appears in the public gallery. Your private management link lets you
        check or remove your submission without an account.
      </p>
      <h2>A growing community gallery</h2>
      <p>
        Explore public scenes in the <Link href="/gallery">gallery</Link> or{" "}
        <Link href="/create">create your own</Link>. Artwork comes from
        different sources, so please read our{" "}
        <Link href="/image-use">image-use information</Link> before reusing a
        download.
      </p>
      <p>
        Questions or suggestions? <Link href="/contact">Get in touch</Link>.
      </p>
    </InformationPage>
  );
}
