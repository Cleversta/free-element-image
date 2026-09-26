# Step 1: connect the project to cloud services

Creating, editing, browser saving, and downloading work without accounts or cloud keys.
The project includes anonymous submissions, a private management page, owner review,
public gallery pages, downloads, and a sitemap. This code does not create
your cloud resources automatically.

## 1. Create Supabase

1. Create a project in [Supabase](https://supabase.com/dashboard). Keep its database password private.
2. Open the SQL editor. Paste `supabase/migrations/001_images.sql` and run it once in the new project.
3. Find the project URL and a backend **secret key** starting with `sb_secret_` in the project API settings.
   This code uses the new secret key, not a publishable key or legacy service-role JWT.

The images table stores metadata and a hash of a future private management token. It does not
require visitor accounts. Browser roles cannot read or write it; future server routes will
expose only published images and safe fields. The schema supports pending submissions and
requires complete metadata before publication. Source artwork rights still need verification
before choosing a public reuse license.

## 2. Create Cloudflare R2 storage

1. Enable R2 in your Cloudflare account and create `freelement-submissions` and `freelement-public`.
2. Keep **all public access disabled** on `freelement-submissions`, including its r2.dev URL
   and custom domains. This holds uploads before publication.
3. Create an R2 API token with **Object Read & Write** access restricted to these two buckets.
   Save its Access Key ID and Secret Access Key, plus your Cloudflare Account ID.
   These S3 credentials are different from a general Cloudflare API token.
4. A public custom domain for `freelement-public`, such as `https://images.yourdomain.com`,
   is optional. The current gallery serves R2 images through your website, so you can leave it unconfigured.
   Do not expose the submissions bucket. Browser upload CORS will be configured with the upload feature.

## 3. Configure locally and check connections

From the project directory:

```bash
cp .env.example .env.local
```

Fill the variables in `.env.local` using your dashboard values. The file is ignored by Git.
Do not paste secret keys into chat, commit them, or prefix them with `NEXT_PUBLIC_`.
Leave `R2_PUBLIC_BASE_URL` empty until the public domain is connected.

Using Node 22, run:

```bash
npm run check:services
```

The command checks that the backend can access the images table and both buckets. It does not
upload files, change database rows, prove write permissions, or verify bucket visibility.
Confirm those permissions and the private bucket's disabled public access in Cloudflare.
Missing configuration produces an error naming the missing variable, without printing secrets.

## 4. Host on Netlify

1. Once these code changes are on GitHub, import `Cleversta/free-element-image` into Netlify.
2. Deploy branch `main`, build command `npm run build`, publish directory `.next`, Node 22.
   These values are provided in `netlify.toml`. Netlify detects its Next.js adapter automatically.
3. Add the same environment variables in Netlify's environment settings. Server credentials
   must be available to **Functions**; include Builds if your environment settings require it.
   Keep their values out of `netlify.toml`. Set `SITE_URL` to your deployed HTTPS site origin.
4. Deploy again after changing environment variables and open `/create` to verify editing and PNG download.

The project now uses a Next.js server build so future API routes can run on Netlify. Do not
publish the old `out/` folder or add a catch-all SPA redirect. Local development uses `.next-dev/`
and production builds use `.next/` so they do not overwrite each other's generated files.

If publishing reports “Publishing is not configured for this host yet”, the API could not
identify a trusted Netlify client IP. The app recognizes Netlify Functions using its
read-only runtime variables (`SITE_ID`, `SITE_NAME`, and `URL`); the `NETLIFY` build flag
alone is not guaranteed at runtime. Deploy the updated server code and keep `SITE_URL`
set to `https://freelementimages.site` for this production domain. The request must include
Netlify's `x-nf-client-connection-ip` header; generic forwarded headers are not trusted.
See [Netlify runtime environment variables](https://docs.netlify.com/build/functions/environment-variables/).

## 5. Enable anonymous submissions

1. Run `supabase/migrations/002_submission_limits.sql` in the Supabase SQL editor.
   It is safe to rerun if the table exists but the quota function is missing.
   Do not run migration 001 again on an existing database.
2. In Cloudflare, open **Turnstile** and create a Managed widget. Add your website hostname.
   For local development, add `localhost` to a development widget.
3. Add these two values to `.env.local` (and later Netlify environment variables):

   ```dotenv
   TURNSTILE_SITE_KEY=
   TURNSTILE_SECRET_KEY=
   ```

   The site key is intentionally returned to the browser to display the widget. The secret
   key stays on the server. Do not use testing keys in production.
4. Set `SITE_URL` to the exact origin you open, including the local port. For example,
   `http://localhost:3000` for `npm run dev`, or `http://localhost:3001` when using port 3001.
   Restart the development server after updating settings. Production requires HTTPS.
5. Run `npm run check:services`. It checks database/bucket access, migration 002's table and quota function,
   and presence of Turnstile keys. It cannot validate the widget's hostname settings or
   permissions to upload; verify those with one deliberate browser submission.
6. Open `/create`, click **Publish**, enter a title, agree to sharing, and finish verification.
   Click **Publish scene**. Keep the private management link; it checks status and removes
   the image. No visitor account is required.

Submissions send compact scene data, not PNG uploads. The server resolves bundled artwork by
ID and renders a 1200 × 800 PNG plus a 480 × 320 WebP thumbnail. At most 60 elements and a
130 KB request body are accepted. Browser PNG downloads still render locally.
Nothing uploads when visitors edit, save in the browser, or download.

Turnstile verifies the expected hostname and action on the server. A database transaction
limits attempts to one per IP per UTC day (after migration 005) and 100 site-wide per UTC day. Only an HMAC of the
IP is stored; counters expire after two days when another submission is attempted. Failed
attempts after verification can consume quota. Production IP detection uses Netlify's
`x-nf-client-connection-ip`; other hosts need their own trusted IP integration before publishing.
Local submission is supported by `npm run dev`, with Turnstile still required.

Management tokens are generated in the browser and only their SHA-256 hash is stored in the
database. The private link carries the token in its URL fragment, then sends it in a POST body.
The last link is saved in that browser when local storage is available; copying it is recommended.
Anyone holding the link can remove the submission. Losing the link means losing anonymous
management access. Deletion removes image objects and keeps a private database receipt.
Interrupted uploads can be removed through their management link after ten minutes. Pending
submissions stay private until reviewed; no automatic retention cleanup is scheduled yet.

## 6. Owner review and public gallery

1. Open `.env.local` and copy the `ADMIN_ACCESS_KEY` value. A random key was generated locally.
   This is only for the website owner. Keep it out of chat, screenshots, and Git.
2. Open `/admin` on your local site and sign in with that key. The key is exchanged for an
   HttpOnly session cookie valid for eight hours; it is not stored in browser local storage.
3. In the Pending queue, open the image preview and check the title, content, and source
   permissions. Confirm that the artwork may be publicly displayed and downloaded, then
   choose **Approve and publish**. Use **Reject** for unsuitable submissions.
4. Approved images appear at `/gallery` and `/images/<slug>`. Each page has a PNG download,
   image metadata, and a sitemap entry. Pending, rejected, and deleted images are excluded.
5. For Netlify, set `ADMIN_ACCESS_KEY` in Functions environment variables and set `SITE_URL`
   to the real HTTPS site origin. A new random key invalidates existing owner sessions.

No new database migration is required for owner review. The public gallery reads only safe
metadata fields through the server. Images are copied to the public R2 bucket and served via
`/api/images/<slug>/image`, `/thumbnail`, and `/download`. This currently uses Netlify bandwidth
and function execution, even though storage is on R2. `R2_PUBLIC_BASE_URL` is reserved for a
future direct delivery integration and is not used by the current gallery. Both buckets may
remain private while using these server routes. Responses use no-store so removals take effect
on subsequent requests; previously downloaded files cannot be recalled.

Current sharing terms cover public display and download only. Approval records `download-only`;
the site does not claim CC0, commercial reuse rights, or ownership of imported artwork. Review
source permissions before approving. Broader reuse licensing needs a separate consent flow.
Rejected submissions keep their private files so the creator can manage removal. The owner UI
currently reviews pending submissions; creators can remove published images with their private link.

Interrupted approvals have a small recovery record in the private bucket. Run
`npm run cleanup:publications` periodically to remove orphaned public copies older than one hour.
The command preserves files referenced by published images and never edits submission status.
It is not automatically scheduled. Each approval uses unique object keys so overlapping approval
or deletion cannot overwrite another attempt. No pending image is approved by the cleanup command.

The sitemap currently includes the latest 1000 published images. Add sitemap pagination before
growing beyond that. Public metadata helps discovery but does not guarantee Google indexing.
Never include owner routes or private management links in public navigation or the sitemap.

## Official references

- [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Netlify environment variables](https://docs.netlify.com/build/frameworks/use-environment-variables-with-frameworks/)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [R2 with the AWS SDK](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)
- [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)

- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)


## 7. Automatic publishing and reports

Run `supabase/migrations/003_image_reports.sql` in the Supabase SQL editor. It is safe to
rerun and does not publish any existing submissions. `npm run check:services` verifies the
reporting table and function without creating a report or consuming quota. `AUTO_PUBLISH=true`
is configured locally; until reporting and owner access are available, new submissions stay
pending. Set it to `false` to require manual review for all future submissions. Existing pending
images are never automatically released by changing this flag.

Every valid catalog scene is eligible for automatic publication, including imported elements.
The artwork verification manifest is informational and no longer gates publication.
Reports and owner removal remain available after publication.

The server ignores client-supplied asset paths, colors, and metadata in favor of the catalog.
Unknown assets, external images, malformed scenes, and arbitrary PNG uploads are rejected.
Netlify's function tracing includes the bundled SVG files used by the renderer. Server rasterization
can differ slightly from the browser at anti-aliased edges. Scenes exceeding 60 elements may
still be edited and downloaded locally but cannot be published.

Simple text checks route links, contact details, control characters, repeated characters, and
some obvious spam/inappropriate terms to review. These are conservative heuristics, not a
comprehensive content moderation service. Turnstile and the existing submission quotas still
apply. An automatic publication failure leaves the submission available for owner review.

Public image pages have **Report this image**. Reporting uses Turnstile with action `report`,
accepts only fixed reason categories, and stores a keyed hash of the reporter's IP rather than
its raw address. One report per image per actor is retained, even after dismissal; limits are
five new reports per actor per hour and 1000 site-wide per UTC day. Reports do not automatically
hide images. The owner selects **Reported** at `/admin`, then dismisses the displayed reports
or confirms **Remove public image**. Removal hides the public page immediately and removes its
public R2 copies; private submission files and the rejected record remain. If storage cleanup
fails, `npm run cleanup:publications` resolves the recovery record after an hour. Report records
are private, retained for owner review, and never included in gallery or sitemap responses.

For local verification after migration 003, publish a new original landscape with no added
objects and an ordinary title. It should show **Your scene is published**. A scene containing
an imported element should also publish automatically. Test reports on a public
image, then use the owner queue to dismiss the test report. Owner publication still requires
checking artwork permissions; automatic publication does not grant a broader reuse license.

## Editable public scenes

Before deploying the Edit this image feature, run
`supabase/migrations/004_editable_scenes.sql` in the Supabase SQL Editor.
New submissions store a validated scene in the private images table. Only
published scenes are exposed through the editor's server-rendered page.
The sharing checkbox includes permission to edit a copy. Existing images have
no saved scene and remain download-only; do not reconstruct or opt them in.
Removing a submission clears its editable scene. Opening a shared scene does
not overwrite the visitor's browser save until they explicitly save it.

Run `supabase/migrations/005_daily_submission_limit.sql` to enable the daily limit.
It resets at midnight UTC. Shared networks share the quota; changing IP can bypass it.
A failed upload after reserving the quota still consumes that day’s attempt.

## Current publishing policy: manual approval only

New submissions always remain pending until owner approval. The application no longer
calls reserve_submission, so migration 005 does not restrict submissions and does not
need to be reversed. AUTO_PUBLISH no longer enables automatic publication. Turnstile,
scene validation, and report limits remain active.
