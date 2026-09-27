# Freelement Images: launch, SEO, and AdSense roadmap

Implementation update: the local code now includes the reliability/SEO fixes, four beginner guides, 12 original starter-scene pages, bounded thumbnail caching, an artwork evidence inventory, and optional ads.txt preparation. See [release steps](RELEASE_STEPS.md) for the migration and account tasks that remain before deployment. The findings below are the original pre-change review, retained for context.

Reviewed September 27, 2026. This is a source-code and public-HTML review, not a complete security audit or a Google approval prediction. No deployment was triggered. Keep implementation local until the owner explicitly asks to push.

## Recommendation

Finish the existing product before adding ads. The editor, manual review flow, management links, gallery routes, image metadata, sitemap, and information pages provide a useful foundation. The most urgent gaps are incorrect canonical URLs, inconsistent public information, incomplete abuse controls, and catalog validation failures. The next growth investment should be useful original examples and guides.

## Evidence and verification

- Public GET checks returned 200 for `/`, `/create`, `/gallery`, `/about`, `/privacy`, `/robots.txt`, and `/sitemap.xml`.
- `/create`, `/gallery`, `/about`, and `/privacy` all declared the homepage as canonical. `/gallery`, `/about`, and `/privacy` repeated the brand in their titles.
- The fetched sitemap contained eight main pages and no published image URLs. The fetched gallery HTML contained no image elements. This observation does not establish whether the database has no approved images or whether a backend problem prevented listing them.
- TypeScript passed. Lint failed on the existing unused `err` in `lib/export.ts:46`.
- The full test run failed on duplicate asset IDs and a native crash in the mixed-publishing test process. Rerunning mixed-publishing alone passed all seven tests. Treat the crash as unresolved/intermittent, not a confirmed application defect.
- The catalog contains 421 entries with 417 unique IDs. Four IDs occur twice and refer to different paths.
- No Search Console, AdSense, Netlify billing, production logs, field Core Web Vitals, or authenticated moderation data was inspected. Browser end-to-end tests were not rerun in this review.

## Stage 1 — reliability and accurate information

### Fix image reporting on Netlify — high priority

`app/api/reports/route.ts` still checks `process.env.NETLIFY === "true"`. Publishing now uses `isNetlifyEnvironment()` from `lib/server/submission-services.ts`. Reporting can therefore hit the same host error that publishing had. Reuse the runtime detection and test the reporting flow when the build-only flag is absent.

Finish when a valid report is accepted on the deployment and quota handling still works. Do not create fake production reports during testing.

### Protect publishing and owner login — high priority

`submit()` calculates an actor hash but does not call `deps.reserve()`. Existing tests explicitly expect quotas to be ignored. The database quota function alone does not protect the rendering/storage path. Add persistent submission limits before expensive rendering, preserve idempotent retry behavior, and deliberately update the tests and user-facing limits. Also add persistent throttling to the owner-login route, which currently validates the secret without an application-level attempt limit.

Finish when excessive requests get a helpful 429 response before expensive work, normal submissions work, and retries cannot accidentally double-charge the quota.

### Escape user text embedded in JSON-LD — high priority

`app/images/[slug]/page.tsx` inserts `JSON.stringify(imageSchema)` through `dangerouslySetInnerHTML`. The schema contains submitted titles and descriptions. JSON serialization alone does not escape an HTML closing-script sequence. Escape `<` as `\u003c` when embedding JSON-LD, and test malicious title/description strings. Manual review reduces exposure but is not a substitute for output escaping.

### Repair catalog identity and publishing compatibility

Duplicate IDs:

- `freeimage-monarch`
- `freeimage-ryanlerch-frigate-bird`
- `freeimage-100710-red-maple-leaf`
- `freeimage-butterfly-xviii-1783226787`

Preserve the existing first-match meaning for saved scenes; remove redundant entries or assign stable distinct IDs with a migration strategy. Do not simply change the test expectation. Audit remaining oversized SVGs and embedded-image assets so visitors know whether an element can be published before completing a scene. Some currently render in the browser but fail the server validator.

### Make public information match actual behavior

- `app/privacy/page.tsx` says the site has no analytics tracking scripts, but `app/layout.tsx` loads Umami Cloud globally. Describe the actual configuration, provider, and data use after verifying the account settings; do not invent retention or cookie claims.
- `/about` and `/image-use` still mention automatic publication, while submission code always sends scenes to review.
- The privacy text describes submission limits that are not currently enforced.
- Keep contact details, reporting, removal instructions, and retention statements accurate.

Finish this stage with passing lint, TypeScript, unit tests, and local desktop/mobile tests for editing, save/reload, download, submission retry, approval, reporting, and removal. Investigate the intermittent native test crash if it repeats.

## Stage 2 — technical SEO

### Correct canonical URLs and titles first

The canonical in `app/layout.tsx` is inherited by pages without overrides. Give each distinct public page its own canonical. Set a useful editor title such as “Free Online Scene Creator”; let the root template append the brand once. Remove the embedded brand suffix from child metadata titles.

For gallery pagination, retain distinct page URLs. Define a deliberate policy for internal search/filter results rather than making them all indexable or pointing unrelated content to the homepage. Keep private owner/manage pages noindex. A robots exclusion alone is not an indexing-removal mechanism.

Finish when rendered HTML has the intended title, description, canonical, and robots rules for main pages, paginated gallery pages, search results, and image details.

### Improve image landing pages

The site already provides HTML image tags, dimensions, alt text, image-specific Open Graph/Twitter metadata, ImageObject structured data, and image sitemap support. Keep these.

Before approving a scene, use a descriptive title and useful caption. “Sunset over a mountain village” helps users more than “hello”. Provide relevant category links, related scenes, and visible usage/credit information where verified. Add descriptive alt text when a title alone is insufficient. Never claim a license in structured data that the underlying artwork does not have.

Use a representative scene preview for general social sharing instead of only the logo. Descriptive slugs can come later; existing stable UUID URLs are valid and should not be broken just for SEO.

### Harden sitemap generation

`app/sitemap.ts` limits published images to 1,000 and catches returned database errors but not exceptions thrown during client creation or a failed query. Preserve static URLs on backend exceptions. Introduce paginated sitemaps before the gallery exceeds the limit. Use real publication/modification dates, not an invented fresh date every request.

### Complete external SEO setup after the release

Verify the domain in Google Search Console, submit `/sitemap.xml`, and inspect the homepage, editor, gallery, and representative image pages. Check Google-selected canonicals and indexing exclusions. Run PageSpeed Insights on mobile for the homepage, editor, and an image page. No rankings or traffic improvement can be guaranteed.

Sources: [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Google image SEO](https://developers.google.com/search/docs/appearance/google-images), [image metadata](https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata).

## Stage 3 — useful content and clear permissions

Choose a clear initial audience. A reasonable starting position is an easy countryside/landscape scene creator for beginners; confirm whether the owner prefers educators, hobbyists, or designers before writing the full content set.

Create a small, carefully reviewed launch collection with varied original compositions and meaningful captions. An editorial target of 12–20 scenes is a practical starting point, not a Google requirement. Add genuinely useful tutorials with screenshots, such as:

- How to create and download your first landscape scene.
- How layering, resizing, and locking work.
- How to build a village illustration step by step.
- How saving, sharing, and the private management link work.

Use real examples rather than repetitive keyword pages or mass-generated filler. Add discoverable navigation between guides, the editor, related collections, and image details.

Resolve artwork provenance before promoting commercial reuse. The publishing-rights registry covers 12 project backgrounds, not the entire catalog; this does not prove other assets lack permission. Record each source, creator, license, evidence, attribution obligations, and permitted uses. Where mixed sources prevent a simple commercial license, retain accurate limited-use wording or offer a separate verified collection.

## Stage 4 — control hosting usage

`app/api/images/[slug]/[variant]/route.ts` uses `Cache-Control: no-store`. Every image fetch calls the server, reads storage, and performs database checks. Home/gallery pages also use dynamic rendering. This is a concrete optimization opportunity, but actual credit savings cannot be estimated without billing and traffic data.

Design a short-lived public cache or CDN strategy with explicit invalidation when images are removed. Keep pending assets private and test that removed content stops being served within the stated window. Do not blindly turn on long-lived public caching: current checks intentionally protect removal behavior.

Memoize duplicate image metadata/page reads within a request where appropriate. Keep assets lazy-loaded and measure mobile loading before deciding on further changes. There is no need to make the entire 31 MB asset catalog load on every page.

Schedule existing orphan-publication cleanup only after choosing a safe cadence and reviewing costs; the repository currently documents a manual cleanup command. Decide a retention policy for rejected/pending submissions and backup/recovery procedures before deleting anything.

Batch local changes into one tested release. No push or deployment without the owner's explicit request.

## Stage 5 — AdSense, after the site is useful and stable

AdSense is a later integration, not a missing launch dependency. Google evaluates useful original content, navigation, user experience, and policy compliance. Approval is not guaranteed, and a fixed article count or traffic target is not a substitute for quality.

1. Review the completed site and artwork rights against Google's publisher policies.
2. Use the owner's real AdSense publisher ID and the verification method supplied by Google. Add the correct `ads.txt` declaration when setting up the account; never ship a fabricated publisher ID.
3. Update the privacy notice for the actual advertising/data practices. Before serving ads in the EEA, UK, and Switzerland, implement the Google-certified consent management solution required by Google's policy. Review other applicable regional requirements for the actual audience.
4. Start with limited, reserved-size ad placements on useful content pages. Keep ads away from download, submit, edit, and navigation buttons to reduce accidental clicks. Initially exclude the editor workspace, owner pages, private management pages, and empty/error states from ads.
5. Test responsive layout, layout shifts, consent behavior, and performance. Monitor policy messages and traffic quality.

Sources: [AdSense site readiness](https://support.google.com/adsense/answer/7299563?hl=en), [consent requirements](https://support.google.com/adsense/answer/13554116?hl=en), [ads.txt](https://support.google.com/adsense/answer/9785052?hl=en), [accidental clicks](https://support.google.com/adsense/answer/10025624?hl=en).

## Release finish line

- Reliability fixes and SEO metadata covered by tests; all required checks pass.
- Core visitor and owner workflows verified locally on desktop/mobile.
- Public wording matches actual behavior and known artwork permissions.
- Useful reviewed scenes and guides are available, linked, and indexable.
- Sitemap, canonical URLs, redirects, and noindex rules are verified after the owner-authorized deployment.
- Search Console and performance baselines are recorded.
- Ads stay disabled until the owner is ready and the real account/consent configuration is available.

Next implementation batch: reporting runtime detection, JSON-LD escaping, duplicate catalog IDs, public-copy corrections, and technical SEO metadata. Submission quotas and caching deserve separate focused implementation and tests because they change behavior.
