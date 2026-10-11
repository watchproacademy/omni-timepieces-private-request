# Omni Timepieces private request app

Next.js App Router / React / TypeScript application. Public service and brand pages are rendered as HTML; the nine-step inquiry uses shared React state. The previous prototype is retained in `legacy/` as a reference and is not served.

## Local development

Use Node 24 and pnpm 11.19.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev`. For an isolated demo, copy `.env.example` to a separate local environment file and set `WATCH_REQUEST_PREVIEW_MODE=true`; demo requests never write to Postgres or send email. Do not overwrite existing real credentials.

Commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm start`, `pnpm test:browser`. Install test browsers with `pnpm exec playwright install chromium firefox webkit`. Browser tests target a production build in preview mode and exercise the real API demo response or isolated mocks. PostgreSQL migration tests run against an in-memory PGlite database; they do not access customer data.

## Sources of truth

- `src/lib/config.ts`: brand identity, public URLs, USD, limits, analytics, copy, and step definitions.
- `src/lib/catalog.ts`: preserved brand profiles, model/reference suggestions, and configuration rules. Suggestions are not inventory.
- `src/lib/content.ts`: public service, FAQ, policy, and brand guidance copy.
- `src/styles/theme.css`: primitive colors and semantic light/dark roles, typography, spacing, and motion. Component styles must use roles instead of color literals. Immutable artwork and rendered email output are documented exceptions.
- `src/lib/state.ts`: reducer actions and the authoritative request state. `payloadFor` derives review/submission data without reading form elements.
- `src/lib/validation.ts`: browser/server rules. Each requested watch and trade must validate; free-form model/reference entries remain supported.

Theme follows the device initially; users can save Light, Dark, or System. Browser drafts are versioned session storage and include contact details. Legacy V3 drafts are migrated defensively. Consent is reconfirmed on restoration. URL prefill overrides corresponding restored brand/model/reference fields. Accepted inquiries clear both draft keys. Theme preference uses local storage independently.

## Production prerequisites

Provision a Neon database and enable Vercel Queues on the existing project. Use a separate database branch and email recipients for preview tests. Apply `pnpm db:migrate` to the intended database before deploying; migrations are additive and are not automatically run during builds.

Configure all keys documented in `.env.example`; production rejects demo mode and incomplete delivery settings at build/startup and submission. Resend needs a verified sender domain. `WATCH_REQUEST_TO_EMAIL` is the owner inbox; `WATCH_REQUEST_REPLY_TO_EMAIL` is the customer receipt reply address; `WATCH_REQUEST_ALERT_EMAIL` receives operational failure alerts. If using a webhook for owner delivery, explicitly set a reply address for receipts and ensure the receiving system deduplicates `Idempotency-Key`.

Never expose server credentials through public environment variables, logs, or client config. Signing secrets must be independent random values with at least 32 characters. Enable preview deployment protection. Keep production public pages accessible to search crawlers.

## Submission contract

`POST /api/watch-request`: same-origin JSON, maximum 30,000 bytes, `Idempotency-Key` (16–100 URL-safe characters). Payload version 4 contains `watches`, `tradeIns`, contact, consent, USD, notes, safe inspiration URL, and campaign attribution. Valid email is mandatory; non-email follow-up also requires a phone. Honeypot submissions are rejected.

Success: `202 {ok:true,status:"accepted",preview:false,requestId}` after the inquiry and owner/receipt jobs commit atomically. A duplicate key with the same normalized payload returns 200 and the same ID. A changed payload under the same key returns 409. Validation returns 400 with field paths; oversized requests 413, cross-origin requests 403, throttling 429, storage/configuration failures 503. Demo acceptance is explicitly marked `preview:true`.

Database-backed limits: 10 accepted requests per hashed source IP/hour, 3 per hashed email/day. Duplicate retries do not consume limits. Contact data and free-text briefs are excluded from analytics. One Google Ads conversion is recorded per durably accepted inquiry on the production host; GPC/DNT disable loading and measurement. Browser-side tracking cannot guarantee attribution when visitors block scripts or close the page.

## Delivery and recovery

The database outbox is authoritative. After acceptance, only job IDs are published to `omni-delivery`. Owner and receipt jobs are independent. Workers atomically acquire a two-minute lease, use 10-second provider timeouts, and use the job ID as the provider idempotency key. Temporary errors retry with backoff up to six attempts. Permanent errors stop and alert. Sent jobs are never sent again automatically.

A crash after provider acceptance is retried using the same key. Resend retains its key for 24 hours, so attempts older than 23 hours stop as ambiguous and require provider reconciliation. Do not manually resend an ambiguous job without checking provider records first. A webhook must implement equivalent deduplication; without that, duplicate delivery cannot be guaranteed away.

The authenticated `/api/maintenance` endpoint purges expired records and drains eligible outbox jobs even when queue publication fails. `vercel.json` schedules it daily at 08:00 UTC to fit basic cron availability; queue processing is immediate normally. Queue outages can therefore delay recovery until the next maintenance run. Monitor the endpoint and queue dashboard for failures and backlog. A paid plan may support more frequent maintenance; change cadence only after confirming quotas.

Failure alerts use the configured email service. During a total email-provider outage, alerts may also fail, so hosting error logs must be monitored independently. Logs include request identifiers/error categories, never full request payloads. Query job status through authenticated database/provider consoles; no public status or data endpoint exists.

Inquiry payloads are deleted after 90 days, cascading to delivery jobs. Expired hashed abuse windows are deleted at maintenance. Queue messages carry identifiers only and expire after one day. Mailbox retention and any CRM retention are separate and are not changed by the database purge.

## SEO and content

Public paths: `/`, `/services`, `/faq`, `/privacy`, `/terms`, `/brands`, and seven `/brands/[slug]` guides. `/index.html` permanently redirects to `/`, preserving campaign queries. Clean canonical URLs exclude campaign parameters. Public metadata, sitemap, crawler rules, supplementary `llms.txt`, and truthful Organization/Service/Breadcrumb markup are generated from central content.

Public pages support search/retrieval bots including OAI-SearchBot; GPTBot training crawls are disallowed. Preview builds are noindex with disallow-all robots. APIs are uncached and noindex. Robots directives are not access controls. Content is server-rendered for humans and crawlers. CSP uses a fresh nonce per HTML response, so public HTML is dynamically rendered rather than cached across nonce values.

Existing imagery in `public/assets/images` is original generated prototype artwork, not approved campaign/product photography. Replace it with licensed approved photography before release. Brand copy and Privacy/Terms require owner review for actual business practices. No inventory, pricing, testimonials, or official manufacturer affiliation is claimed.

The retained legacy audio file has CC0 provenance: celesti-whispers, “wristwatch,mechanical,clock,ticking,contact mic,loop,denoised.wav”, https://freesound.org/people/celesti-whispers/sounds/495889/ (https://creativecommons.org/publicdomain/zero/1.0/). The current interface synthesizes a soft mechanical escapement at eight beats per second (a 4 Hz balance / 28,800 beats per hour). Each beat combines tiny unlock, impulse, and lock contacts with damped metal resonance; tick/tock timbre alternates subtly across several locally generated textures. Web Audio schedules the contacts on its audio clock at a fixed low gain. Form interactions do not add extra clicks to that rhythm. Sound is off initially, starts only after explicit opt-in, and switches off when the page is hidden or leaves. Returning to the page requires fresh opt-in; queued contacts are canceled when switched off. It never downloads or autoplays the legacy loop. The animated sound control has only on/off states; there is no volume slider. Playback errors leave the control off and provide a retry message.

## Release procedure

See `launch-kit/implementation-verification.md` for completed verification and outstanding external gates, and `launch-kit/app-release-checklist.md` for account eligibility, quota checks, preview verification, email smoke tests, Search Console setup, promotion, and rollback. Existing campaigns and budgets are not modified by this app migration.

Font assets are compressed WOFF2 files hosted locally in `public/fonts` with `font-display: swap`. DM Sans and Newsreader retain their SIL Open Font License files alongside the fonts. There is no external Google Fonts request on page load.

First-paint theme selection uses a nonce-protected inline bootstrap; it avoids an extra blocking request. Decorative photography loads with low priority. Typeface files retain their original names and licenses; compression reduced the original font bytes by 62%.

## Visual identity

`src/components/watch-movement.tsx` supplies the shared decorative calibre on the funnel and public pages. Rotating gears, the ticking seconds wheel and oscillating balance use CSS transforms and stop for reduced-motion preferences. `src/styles/atmosphere.css` owns the mechanism and metal/paper surfaces; `src/styles/editorial.css` owns public reading layouts. All colors derive from semantic light/dark roles in the shared palette. Newsreader and DM Sans remain the original typefaces.

## Interaction design

Simple choices advance after a 280ms selection cue. Arrow keys explore radio choices without advancing; Enter confirms. Back cancels pending advancement. Custom brands, custom budgets, model details, trade details, and incomplete contact details stay open for completion. Review edits return to Review directly, except changing a brand always requires model details first. Progress comes from the central step definitions.

The sun/moon appearance switch uses a sliding indicator, keyboard radio controls, and the saved preference; all motion respects reduced-motion settings. The mobile action bar stays reachable while long content scrolls. The draft indicator reports actual session-storage success or failure. The confirmation screen provides a copyable request ID and factual next steps. The request homepage presents a focused introduction, owner-supplied $100M+ inventory-access and 24H sourcing copy, and one “Let’s get started” CTA. The CTA loads the funnel; promotional directory cards remain absent. Its one-row header keeps sound, a compact appearance disclosure, and navigation beside the wordmark. Public informational pages remain available through the menu; only Privacy and Terms appear below the form. The introduction avoids autofocus; entering the funnel and moving through steps focuses the relevant heading. Returning drafts resume their saved state after the CTA. Light and dark are the only appearance choices; the initial device preference is resolved into one of those modes.

Catalog fields use a shared editable combobox rather than browser-native datalists. Opening a picker shows all configured suggestions; typing filters them. The pinned “Other / enter manually” option clears the value and focuses the input. Arrow keys explore, Enter selects, Escape closes, and outside clicks dismiss. Menus are portaled over the form, reposition around the visual viewport, and do not move Continue when closing. Reference suggestions remain model-dependent; trade fields use the same component. Model chips and guidance expose selected states. Watch tabs include the brand and model (or brand plus Guidance).

The description guide clears suggestions whenever the brief is edited. Applying a suggested budget replaces prior numeric bounds, including clearing a stale minimum. The guidance shortcut leaves the model open and explains that the concierge will help select it.

### Mobile delivery

The shared configuration provider is independent of request state, keeping catalog, validation, draft, and submission code out of public-page dependencies. Later funnel sections load as separate chunks. Header, footer, and editorial links do not speculatively prefetch entire routes; normal links and server-rendered public content remain intact.

Latin WOFF2 subsets reduce initial font transfer while the complete licensed fonts remain available for other characters. Regenerate the subsets with `scripts/subset-fonts.py` using the pinned optional font tooling documented in that file. Both font faces keep `font-display: swap`; the hero subset is preloaded. Photography uses the approved Next image quality setting of 60, retaining responsive sizing and lazy loading. Compare mobile lab evidence in `launch-kit/mobile-before.json` and `launch-kit/mobile-after.json`; these are not production field measurements.

### Private request tracking (staged feature)

`REQUEST_TRACKING_ENABLED` defaults to false. Do not enable it before applying
`002_tracking.sql`, configuring `TRACKING_OWNER_EMAIL`, and testing the Shopify
connection in an isolated preview. The main inquiry/submission flow works while
tracking is disabled. `pnpm db:migrate` applies both additive migrations.

Customers use **Check my request**, entering the reference from their receipt and
its email address. Matching customers receive a one-use link valid for 15 minutes;
opening it creates a one-hour HttpOnly session. The link is carried in a URL
fragment and removed before opening the request. Owner login uses only
`TRACKING_OWNER_EMAIL`; customer sessions cannot access the owner list or updates.
Links and sessions are stored only as hashes. Rate limits use database counters.
No private pages enter the sitemap; responses are uncached and noindex.

Owners select a request, update each watch's sourcing/quote/waiting/cancelled stage
and customer-visible note, then paste the Shopify admin order URL and choose its
quantity-one line item. The order email must match the inquiry. A Shopify line
cannot be linked to multiple watches. Editing uses version checks to reject stale
forms. Clearing a link never changes the Shopify order.

Shopify is read-only. Configure a Dev Dashboard app installed on Omni's
`11af59-2.myshopify.com`, with order read access. Set its `SHOPIFY_CLIENT_ID` and
`SHOPIFY_CLIENT_SECRET` as server-only environment variables. Client-credentials
access requires the app and store to belong to the same Shopify organization.
The app exchanges credentials for a temporary token, refreshing before expiry.
No connector token is copied into the website. Orders older than Shopify's
standard 60-day access window require approved `read_all_orders` access; without
it the interface clearly shows a stale update and the customer should contact
the desk. Do not promise automatic delivered status without carrier confirmation.

Order snapshots refresh when an authenticated user opens or refreshes the page,
with a 60-second cache; this initial version does not use webhooks or send status
change emails. Failed refreshes explicitly show that the cached status may be
stale. A label alone is not shipment; partial payments are not paid. Shopify
cancellations/refunds supersede the normal timeline. Each watch follows its own
fulfillment item. Truncated or multi-quantity order items fail closed.

The existing 90-day inquiry purge cascades to watch progress, audit entries, and
customer access records. Maintenance also deletes expired owner sessions/links
when tracking is enabled. Shopify order and email retention are separate.

For preview email links set `TRACKING_SITE_URL` to the isolated HTTPS preview URL;
production defaults to `https://concierge.omnitimepieces.com`. Never enable a
preview against the production database. Verify owner/customer access separation,
expired/replayed links, wrong order/email, stale edits, split shipments, partial
payment, refunds, and unavailable Shopify before public launch.

### Customer/operator portal (feature gated)

`REQUEST_PORTAL_ENABLED=true` enables the independent workflow and requires private
tracking access, migration `003_portal.sql`, and a separate PRIVATE Vercel Blob
store per environment. Never attach the production store to preview deployments.
The operator entry is `/private-desk`; customers use `/request-status`. Only the
configured owner email can manage requests; no AI agent or extra team access is
granted. Session links remain single-use and expire after 15 minutes.

Stages are Received, Sourcing, Quote sent, Invoice sent, Paid, Transaction review,
Ready to ship, Shipped, Delivered, plus Waiting and Cancelled. Stage changes save
a customer email job atomically. Public messages and ready uploads also notify
the appropriate party; internal notes are never included in customer responses.
Retries use the existing outbox worker and maintenance reconciliation.

KYC review is manual. The owner requests one identity document and optionally
address/business evidence. Customers submit the form and requested files. The
owner must explicitly attest to review before approval. Shipping requires approval
and a previously recorded paid/review stage, plus carrier and tracking number.
Shopify connection is optional evidence only; it cannot advance the independent
workflow or override approval. Reconnect an order item to refresh its evidence.

Files are private, authenticated downloads only, with generated names, signature
checks (PDF/JPEG/PNG), 3 MB each and 20 files per request. No inline previews or
automatic malware scan are provided. The operator should only open expected
files with appropriate device protection. Files are not included in emails.
Pending upload reservations are cleaned after one hour; completed files are
retained one calendar year from upload. Request retention extends to cover those files.
Cleanup deletes objects before metadata, and blocks parent deletion while files
remain. A database trigger protects retained inquiries from the older 90-day
cleanup path. Retention settings are business choices, not legal determinations.
Free storage has capacity/operation limits; an exceeded limit can interrupt
uploads or downloads. No paid upgrade is automatic or authorized.

Use synthetic documents only in tests. Before enabling production, verify both
roles, cross-request denial, upload/download, incomplete and approved KYC,
shipping rejection before approval, notification delivery, and expiry cleanup.

Portal release gate: production document collection remains disabled pending confirmation of the Florida retention schedule. Buyer verification, secondhand acquisition/trade-in records, and invoices must not be assumed to share one legal retention period. The preview one-year expiry is a test configuration, not a compliance determination.

### Short request references
Migration `004_request_references.sql` adds stable unique customer references such as `OMNI-7K9M-4R2X`, including for existing inquiries. The original inquiry IDs remain unchanged for relationships, delivery deduplication, and analytics. Login accepts either reference plus the matching email; short references ignore case, spaces, and hyphens. Database allocation serializes collision checks and retries collisions. Apply this additive migration before deploying code that reads `public_reference`.

Migration `005_dated_request_references.sql` changes displayed references to `OMNI-WR20261010-0001-QFPU`: Miami calendar date, transactional daily sequence (minimum four digits, expands beyond 9999), and four uppercase letters excluding I/O. This is receipt order, not fulfillment priority; daily volume is visible. Existing inquiries are numbered chronologically per day, with their previous references retained as email-bound login aliases. Internal IDs and private links remain unchanged. Apply 005 after 004 before deploying the updated login route. Counters retain only dates/numbers so deleted inquiry numbers are never reused.

Migration `006_request_reference_tiers.sql` adds the frozen submitted-budget classification before the daily number: A < $15k; B < $100k; C < $500k; D through $1m; E > $1m. U means unknown/open-ended or a combined range spanning tiers. X means more than one requested watch (trades do not count or reduce the budget). Example: `OMNI-WR20261010-BX0001-QFPU`. All tiers share one daily counter. Classification is never recomputed on later payload updates; previous references remain login aliases. Migration 005 recognizes classified references on reruns to preserve them.
