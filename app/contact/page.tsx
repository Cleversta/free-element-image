import { pageMetadata } from "@/lib/seo";
import InformationPage from "@/components/InformationPage";
export const metadata = pageMetadata(
  "Contact",
  "Contact Freelement Images for help, feedback, privacy requests, or artwork concerns.",
  "/contact",
);
export default function Contact() {
  return (
    <InformationPage title="Contact">
      <p>
        For help, feedback, privacy requests, or artwork concerns, email
        Freelement Images at:
      </p>
      <p>
        <a href="mailto:cleverstar02@gmail.com">cleverstar02@gmail.com</a>
      </p>
      <h2>Help with the editor</h2>
      <p>
        Tell us what you were trying to do, what happened, and which browser and
        device you use. You can include a screenshot, but remove private links
        and credentials first.
      </p>
      <h2>Report an image or a rights concern</h2>
      <p>
        Use “Report this image” on its public page, or email the public image
        URL and an explanation. For a rights concern, include the original
        source and information showing your connection to the artwork.
      </p>
      <h2>Privacy and removal requests</h2>
      <p>
        You can remove your submission using its private management link. If you
        need help or have lost that link, email the public image URL or other
        details identifying your submission. We may need additional information
        to establish that the request is yours. Never post your private
        management link publicly.
      </p>
      <p>
        Email opens your own email app. This website does not submit a contact
        form or automatically send a message.
      </p>
    </InformationPage>
  );
}
