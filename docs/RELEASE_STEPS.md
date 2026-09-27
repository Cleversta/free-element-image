# Local release checklist

This work is local. Do not push or deploy until the owner explicitly requests it.
Audience: beginners and hobbyists. Search Console is already set up. AdSense is not enabled.

## 1. Before deploying the code

Apply database migrations in the Supabase SQL editor, in order. Keep existing images and counters.

- Confirm migrations 001–004 are already applied for the existing publishing/review flows.
- Apply `005_daily_submission_limit.sql` if not already applied.
- Apply `006_launch_limits.sql`. It is safe to rerun and adds persistent submission reservations and owner-login attempt limits.

Migration 006 depends on 002 (submission limits). If repairing a partial setup, apply 002, then 005, then 006. Applying 002 after 005 changes the quota back to five per hour, so preserve this order.

After applying the migrations, run `npm run check:services` with your configured environment. Its invalid-input probes check function availability without consuming a quota or writing records.

No production migration was run by the assistant. The migration has been tested against an isolated local PostgreSQL-compatible database. Without 006, the new code fails closed on new submissions and owner sign-in. Do not deploy the code first.

The submission allowance after 005 is one new submission per IP per UTC day, with a shared 100-per-day site ceiling. People on the same public network share that allowance. A submission token may retry up to three processing attempts within its reservation lifetime without spending another daily slot. Completed receipts remain idempotent. Failed attempts can consume the daily slot; local editing/downloads remain available. Owner sign-in permits ten attempts per IP per 15-minute bucket.

## 2. Check locally

Use Node 22:

```sh
npm run check
npm run build
npm run test:e2e
```

Browser tests run against the local production server. External service writes in tested publishing/owner UI flows are mocked. Unit tests use isolated database instances. Do not point these tests at production.

Preview with `npm start`. Review `/`, `/scenes`, `/scenes/alpine-mirror-lake`, `/guides`, `/create?template=alpine-mirror-lake`, and `/privacy` on desktop and mobile.

Derived content assets can be regenerated with `node scripts/prepare-content-assets.mjs`. Refresh the source-evidence inventory with `node scripts/audit-artwork.mjs`; this does not verify the truth of source metadata or grant a license.

## 3. One owner-authorized deployment

Once the local changes are reviewed and the migration is applied, the owner can request one push/deployment. Keep `SITE_URL=https://freelementimages.site` in the Netlify environment, available to the necessary build and Functions scopes. Keep private credentials out of Git.

Optional `GOOGLE_SITE_VERIFICATION` is only needed for HTML-tag verification. If Search Console is already verified through DNS, leave this empty and preserve the existing DNS record.

## 4. Check the actual deployment

- Submit a real intended scene, inspect its private receipt, review it, and check its public image page.
- Confirm original image and download URLs stop serving withdrawn images. Browser thumbnails have a maximum 60-second cache; shared image caching remains disabled.
- Check the reporting flow with a legitimate report when available; do not submit fabricated abuse reports.
- Check titles, descriptions, canonicals, and noindex rules on the deployed HTML.
- `/sitemap.xml` is now a sitemap index. `/sitemaps/main.xml` lists the main pages, guides, and 12 starter scenes. `/sitemaps/images/0.xml` and subsequent pages list up to 1,000 published images each.
- The index preserves static-page discovery on a database outage. Image sitemap requests return a retryable 503 rather than falsely reporting the gallery empty.

In the existing Google Search Console property, submit or resubmit `https://freelementimages.site/sitemap.xml`. Use URL Inspection on the home page, `/create`, `/scenes`, one guide, and an approved image page. Indexing is Google's decision and may take time; do not repeatedly deploy just to request indexing.

Run PageSpeed Insights for the deployed home page, editor, starter-scene page, and a public image page. Record mobile results and field data if available. A local browser test is not a field Core Web Vitals measurement.

## 5. Artwork and editorial review

The starter collection uses the 12 original project backgrounds already recorded in `data/publishing-rights.json`. No community submissions were approved automatically or inserted into the live database.

`docs/ARTWORK_REVIEW.json` inventories file hashes and embedded source/license claims. For other artwork, check the original source, creator, permission terms, attribution requirements, and whether the source is credible. Metadata is evidence to investigate, not proof of permission. Do not market the complete catalog as CC0 or commercially reusable until that review is complete.

The guides describe the current controls and distinguish browser saves, downloads, and submissions. Review the privacy notice against the actual Umami Cloud account retention settings; no retention period has been invented in the notice.

## 6. AdSense later

No Google advertising script, ad slot, or fabricated publisher ID is installed.

When the owner is ready:

1. Apply using the real AdSense account and follow Google's site-verification instructions.
2. Set `ADSENSE_PUBLISHER_ID=pub-` followed by the real 16-digit ID. This only enables the correct `/ads.txt` record; it does not load or activate ads. Until configured, `/ads.txt` returns 404.
3. Review artwork rights and the current publisher policies. Finish the actual consent setup and update the privacy notice before ad serving. Use a Google-certified CMP where Google's EEA/UK/Switzerland requirements apply.
4. Add a small number of reserved-size ad placements to useful content pages. Keep ads away from download, editor, submit, and navigation controls. Exclude private, owner, empty, and error pages. Re-test layout shifts, performance, and consent behavior.

Sources: [site readiness](https://support.google.com/adsense/answer/7299563?hl=en), [ads.txt](https://support.google.com/adsense/answer/9785052?hl=en), [consent requirements](https://support.google.com/adsense/answer/13554116?hl=en), [accidental clicks](https://support.google.com/adsense/answer/10025624?hl=en).

AdSense approval, search rankings, and earnings are not guaranteed.

## 7. Ongoing operation

Review new submissions and reports regularly. Use `npm run cleanup:publications` to recover orphaned public copies after interrupted approvals. This existing command can delete orphaned objects; no cleanup or schedule was run during this implementation. Start with a reviewed manual run, then decide whether a weekly operator-run task is worthwhile for your actual volume and budget.

Rejected/private uploads retain the existing retention behavior. No bulk deletion, backup-policy change, or paid scheduler was introduced. Before adopting automatic deletion, document the retention period and verify backups/restore access with the owner.

## Local verification result

Node 22: lint, TypeScript, and 49 unit/database tests passed. The production build passed. All 22 desktop/mobile browser tests passed, including download pixel comparisons. New scene and guide layouts were visually inspected on desktop and mobile. Live migration, deployed performance/indexing verification, source-license verification for imported artwork, and the later AdSense account/consent setup remain owner steps.
