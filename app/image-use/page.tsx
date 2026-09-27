import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import InformationPage from "@/components/InformationPage";
export const metadata = pageMetadata(
  "Image use and permissions",
  "Understand the difference between free downloads and permission to reuse artwork.",
  "/image-use",
);
export default function ImageUse() {
  return (
    <InformationPage title="Image use and permissions">
      <h2>Edit a copy</h2>
      <p>
        Images with an “Edit this image” button include permission to open and
        modify a copy in our editor. Older images without saved scene data are
        download-only. This does not grant unrestricted rights to the underlying
        artwork.
      </p>
      <h2>Free to download</h2>
      <p>
        The editor and public gallery offer PNG downloads without a payment or
        visitor account. Public gallery images are shared for display and
        download.
      </p>
      <h2>No blanket reuse license</h2>
      <p>
        We do not label the entire catalog or gallery as public domain, CC0, or
        unrestricted stock imagery. A free download does not by itself grant
        permission for commercial use, redistribution, resale, or removal of
        attribution. Artwork can come from different sources with different
        conditions.
      </p>
      <h2>Before reusing an image</h2>
      <p>
        Check the source permissions for the artwork you intend to use. If the
        public page does not provide the permission you need,{" "}
        <Link href="/contact">contact us</Link> with its public URL before using
        it beyond display and download. Editing a scene does not erase the
        rights in its underlying elements.
      </p>
      <h2>What publication checks mean</h2>
      <p>
        Every submitted scene requires owner review before publication. These
        checks concern sharing on this website; they are not a promise of a
        broader license for every future use.
      </p>
      <h2>Rights concerns</h2>
      <p>
        If you believe an image uses artwork without permission, report it on
        the image page or email{" "}
        <a href="mailto:cleverstar02@gmail.com">cleverstar02@gmail.com</a> with
        its public URL, the original source, and your explanation. Please do not
        include a creator’s private management link.
      </p>
    </InformationPage>
  );
}
