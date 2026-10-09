# Migration verification — 9 October 2026

The application migration is implemented. Production launch remains gated by infrastructure and owner review; the public production domain still serves the previous deployment.

## Verified

- Next.js/React/TypeScript migration with locked packages and Node 24.
- Type checks, lint, 25 unit/PostgreSQL tests, and optimized build pass.
- 40 browser checks pass across Chromium, Firefox, WebKit, and mobile WebKit: nine-step acceptance, mandatory email and consent, model resets, draft recovery, review editing, multiple watches/trades, local guidance, submission retries, both themes, narrow-screen reflow, initial public HTML, metadata, crawler files, and campaign-preserving redirects.
- Automated WCAG A/AA checks report no violations on the tested light/dark funnel entry screens. This is not a complete manual accessibility certification.
- Desktop/mobile screenshots reviewed in both themes, including a 320px reflow check. Screenshots are in `launch-kit/screenshots`.
- Real PostgreSQL migration semantics tested in isolated PGlite, including concurrent duplicate keys, atomic inquiry/jobs, throttling, leasing, and cascading retention. Provider adapters and worker failure paths use isolated mocks, not real emails.
- Protected Vercel demo preview is READY: https://omni-timepieces-private-request-c1f2naanr-watch-pro-academy.vercel.app
- Preview ID: `dpl_6JaFkwujATTZDhDRJXHstdx5mK4B`. Source: local commit `81bcba9` on `codex/launch-readiness`. The GitHub push is awaiting workflow authorization.
- Authenticated preview checks: brand page responds 200 with readable sourcing content, canonical link, breadcrumb markup, and noindex. Robots disallows all. The deployed demo API returns `accepted`, `preview:true`, and stable ID `DEMO-BCE540BDB94D` for the controlled test key. No inquiry or email was created.
- Production baseline inspected: `dpl_38T3jVQNXWoLydMCfeCwBSfrA6xi`. Recheck before a future promotion.

Local mobile diagnostic samples are recorded in `mobile-performance.json`. These are optimized localhost Chromium measurements with simulated network/CPU restrictions, not Lighthouse scores, production Core Web Vitals, or field INP evidence. Production performance testing remains a release gate.

## External gates still open

The existing Vercel project has no connected Marketplace resources. Its inspected production environment contains the existing Resend credential and sender/owner settings, but no database or new signing/maintenance/alert settings. Credentials were not printed or changed.

1. Provision/connect separate Neon production and controlled preview databases; apply the additive migration to the intended environments.
2. Add signing/maintenance secrets, operational alert inbox, receipt reply routing, and enable/verify the queue consumer and authorized maintenance schedule.
3. Verify Resend sender DNS, quotas, owner inquiry delivery and customer receipt using clearly marked controlled inboxes. Independently verify failure recovery and alerts against the real services.
4. Confirm the hosting subscription permits commercial use and approve provider allowances/budgets. No billing subscriptions were purchased or upgraded.
5. Approve factual copy, Privacy/Terms, and licensed imagery. Current generated prototype imagery remains a release gate.
6. Configure required repository/Deployment Checks, staged production verification, monitoring, and rollback ownership. CI source exists; remote branch protections/check requirements have not been configured.
7. Complete production performance/crawler access checks, Search Console ownership and sitemap submission, and actual accepted-conversion verification.

Follow `app-release-checklist.md` for staging a production build without assigning domains, verifying it, and promoting that exact build. Do not promote this demo preview as a ready production system.

## Continuation findings

- Fixed required descriptions for custom trade presentation, complete trade configuration summaries, and focus after mobile start and acceptance. Expanded rare-brand/guidance, phone-required, review accessibility, theme persistence, and unavailable-storage coverage passes on all four browser projects.
- The Vercel team is confirmed active Hobby. The user declined a paid upgrade; the commercial-use launch gate remains open pending a hosting decision.
- The user approved two Free-plan Neon databases. No resource was created: Marketplace requires the user to accept Neon terms at https://vercel.com/watch-pro-academy/~/integrations/accept-terms/neon?source=cli before provisioning.
- Production email settings are Sensitive. Local exports contain placeholders; their invalid-key API response does not indicate that the actual production key is invalid. Verify sending inside a configured deployment.
- GitHub initially rejected branch protection for the private repository. The owner made it public; workflow upload still requires additional OAuth permission. CI and required-check configuration remain pending publishing.
- Mobile Lighthouse baseline: performance 85, accessibility 100, best practices 96; LCP 3.9s, CLS 0.002. The baseline identified a blocking theme request; the nonce-protected inline replacement was re-audited in the final results below.

### Final local follow-up

Fonts were compressed to licensed WOFF2 (62% smaller), decorative imagery was assigned lazy/low priority, typography sizes were centralized, enhanced-conversion collection was explicitly disabled, and saving now disables competing form edits. A Firefox accessibility failure identified transient theme contrast during background fading; that fade was removed.

Isolated mobile Lighthouse results: funnel performance 93 / accessibility 100 / best practices 96, LCP 3.1s, CLS 0, TBT 70ms; representative brand page performance 97 / accessibility 100 / best practices 100, LCP 2.5s, CLS 0, TBT 90ms. The funnel LCP target still needs production verification/improvement; these local measurements are not field results. Reports are stored beside this document.

Final hosted demo checks pass: HTTP 200 initial Rolex guide HTML, clean canonical, breadcrumbs, noindex, nonce-protected theme bootstrap, WOFF2 fonts, disallow-all preview robots, and explicitly marked demo acceptance. No live inquiry or email was created.
