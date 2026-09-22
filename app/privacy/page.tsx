import Link from "next/link";
import InformationPage from "@/components/InformationPage";
export const metadata = {
  title: "Privacy | Freelement Images",
  description:
    "How Freelement Images handles local saves, optional submissions, reports, and service data.",
};
export default function Privacy() {
  return (
    <InformationPage title="Privacy notice">
      <p>Last updated: September 22, 2026.</p>
      <p>
        This notice describes the current Freelement Images service. For
        questions or requests, contact{" "}
        <a href="mailto:cleverstar02@gmail.com">cleverstar02@gmail.com</a>.
      </p>
      <h2>Editing and saving in your browser</h2>
      <p>
        Editing and PNG downloads happen in your browser. Merely editing or
        downloading does not upload your scene. Loading the website and its
        artwork still sends normal web requests to the hosting service.
      </p>
      <p>
        When you choose Save, the scene is stored in this browser’s local
        storage. The latest private submission link is also stored there when
        available. Clearing website data removes those local records. Anyone
        with access to your browser profile may be able to access them.
      </p>
      <h2>When you publish</h2>
      <p>
        We receive the scene data, title, description, sharing consent, and a
        private management token. The server renders the image and stores its
        image files and thumbnails in Cloudflare R2. Supabase stores submission
        details, status, dates, consent, and a hash of the management token. The
        raw token is not stored in the submission database.
      </p>
      <p>
        Published images, titles, descriptions, dimensions, and publication
        dates are public. Search engines and other visitors may copy or download
        them. Pending submissions remain private to the service and its owner.
        Do not include private personal information in your title or
        description.
      </p>
      <h2>Reports and abuse prevention</h2>
      <p>
        Reports record the image, a selected reason, dates, and a keyed hash
        derived from the reporter’s IP address. Submission and report limits
        also use keyed IP hashes. These application records do not store the raw
        IP address; hosting and security providers may process IP addresses in
        their own request logs.
      </p>
      <p>
        Publishing and reporting use Cloudflare Turnstile, which processes
        technical browser and device information to check for abuse. Read the{" "}
        <a
          href="https://www.cloudflare.com/turnstile-privacy-policy/"
          rel="noreferrer"
        >
          Cloudflare Turnstile Privacy Notice
        </a>{" "}
        for details.
      </p>
      <h2>Service providers and email</h2>
      <p>
        We use Supabase for database services and Cloudflare for storage and bot
        checks. The production website is configured for Netlify hosting. These
        providers process requests needed to deliver and protect the service;
        processing locations depend on their infrastructure and account
        configuration. If you email us, your address and message are handled
        through the contact mailbox and its email provider.
      </p>
      <h2>Cookies, advertising, and analytics</h2>
      <p>
        The owner login uses an essential session cookie lasting up to eight
        hours. Visitors do not need this cookie to edit or download. The current
        website does not include advertising or analytics tracking scripts. We
        will update this notice and the relevant privacy controls before adding
        those features.
      </p>
      <h2>Retention and removal</h2>
      <p>
        Saved scenes and private links stay in your browser until replaced or
        cleared. Public and pending images remain in storage until removed;
        rejected submissions are not automatically deleted. The private
        management link removes image files while retaining a private submission
        record. Reports, submission metadata, and contact messages do not
        currently have a fixed automatic deletion schedule.
      </p>
      <p>
        Rate-limit records older than two days are cleaned up when relevant
        later requests run. Provider logs and backups may follow separate
        retention schedules. Removing an image from this site cannot remove
        copies already downloaded or cached elsewhere.
      </p>
      <h2>Your choices</h2>
      <p>
        You can use the editor without publishing, clear local website data,
        remove your submission using its private link, or contact us about
        access, correction, or deletion of information associated with you. We
        may need to verify a request before acting. See{" "}
        <Link href="/contact">Contact</Link> for details.
      </p>
    </InformationPage>
  );
}
