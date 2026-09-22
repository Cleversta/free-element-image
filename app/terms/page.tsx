import Link from "next/link";
import InformationPage from "@/components/InformationPage";
export const metadata = {
  title: "Terms | Freelement Images",
  description:
    "Rules for using the editor, submitting scenes, and managing public images.",
};
export default function Terms() {
  return (
    <InformationPage title="Terms of use">
      <p>Last updated: September 22, 2026.</p>
      <h2>Using the service</h2>
      <p>
        Freelement Images provides a free scene editor, PNG downloads, and
        optional public sharing. Visitor accounts are not required. Please use
        the service responsibly and follow these terms when creating or sharing
        content.
      </p>
      <h2>Publishing a scene</h2>
      <p>
        By choosing to publish and confirming sharing, you permit Freelement
        Images to store and process the submission, generate its image and
        thumbnail, display it publicly, and make it available for download. New
        submissions also allow visitors to open and edit a copy in our editor.
        You retain any rights you hold in your contribution. Sharing does not
        transfer ownership or grant rights you do not have in underlying
        artwork.
      </p>
      <p>
        Submit only content you are entitled to share. Do not submit unlawful
        content, harassment, private information about others, misleading
        impersonation, spam, or material that infringes someone else’s rights.
        Do not bypass verification, access controls, or usage limits.
      </p>
      <h2>Review and removal</h2>
      <p>
        Valid editor submissions publish automatically when automatic publishing
        is enabled. Submissions may remain private if publishing is disabled or
        unavailable. We may hold, reject, or remove content because of
        permission concerns, abuse reports, technical problems, or these rules.
        Publication is not a guarantee that every possible use of an image is
        permitted.
      </p>
      <p>
        Keep your private management link secure: anyone holding it can manage
        removal of that submission. If you lose it, recovery may not be possible
        without establishing that the submission is yours. You can also{" "}
        <Link href="/contact">contact us</Link> about a concern.
      </p>
      <h2>Downloads and artwork permissions</h2>
      <p>
        Free download does not mean public domain or unrestricted commercial
        use. Please read the{" "}
        <Link href="/image-use">image-use information</Link> and check the
        permissions applying to the underlying artwork before additional reuse.
      </p>
      <h2>Availability and changes</h2>
      <p>
        The service may change or be temporarily unavailable. Keep your own
        copies of images you need; browser saves and hosted submissions are not
        a backup service. Usage limits may apply to protect availability.
      </p>
      <p>
        These terms describe the current service and do not remove rights that
        applicable law gives you. Material changes will be reflected on this
        page with an updated date. Questions can be sent to{" "}
        <a href="mailto:cleverstar02@gmail.com">cleverstar02@gmail.com</a>.
      </p>
    </InformationPage>
  );
}
