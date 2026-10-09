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

The mechanical watch audio keeps the original CC0 provenance: celesti-whispers, “wristwatch,mechanical,clock,ticking,contact mic,loop,denoised.wav”, https://freesound.org/people/celesti-whispers/sounds/495889/ (https://creativecommons.org/publicdomain/zero/1.0/). It is loaded only after sound opt-in and stops when the page is hidden.

## Release procedure

See `launch-kit/implementation-verification.md` for completed verification and outstanding external gates, and `launch-kit/app-release-checklist.md` for account eligibility, quota checks, preview verification, email smoke tests, Search Console setup, promotion, and rollback. Existing campaigns and budgets are not modified by this app migration.

Font assets are compressed WOFF2 files hosted locally in `public/fonts` with `font-display: swap`. DM Sans and Newsreader retain their SIL Open Font License files alongside the fonts. There is no external Google Fonts request on page load.

First-paint theme selection uses a nonce-protected inline bootstrap; it avoids an extra blocking request. Decorative photography loads with low priority. Typeface files retain their original names and licenses; compression reduced the original font bytes by 62%.
