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

## Visual correction approved by the owner

Restored a shared mechanical watch atmosphere across all pages: rotating gears, a ticking seconds wheel, an oscillating balance and escapement, and the existing movement photograph. Light mode now uses warm parchment, champagne/bronze surfaces and layered paper panels rather than near-white surfaces. Original Newsreader/DM Sans families are unchanged. Public pages use a shared editorial hero, reading panels and primary navigation. Component colors remain semantic tokens.

Verified type checks, lint, 25 unit/database tests, optimized build and a clean 40-test browser run at CI concurrency (58.6s). Two scenarios timed out during an earlier run competing with 14 accessibility audits; both passed independently and in the clean full rerun without changing timeouts or assertions. The seven sampled routes passed automated WCAG checks in both themes, public pages fit 320px, animations visibly advance and stop under reduced motion, and no script errors were observed. Desktop/mobile screenshots are in `screenshots/design-refinement`.

Mobile localhost Lighthouse on the revised services page: performance 92, accessibility 100, best practices 100; LCP 3.2s, CLS 0, TBT 60ms. These are lab measurements; production performance remains an open release gate.

Refined protected demo preview is READY: https://omni-timepieces-private-request-9m3tj96u2-watch-pro-academy.vercel.app (`dpl_BYX6a5bAkiUpdKvkbMbQLarbQE8a`, application commit `fc293dc`). Existing production and account/infrastructure gates are unchanged.

## Designer feedback and interaction refinement

Replaced the plain homepage service/brand/FAQ link row with three image-led editorial panels and retained the animated mechanical watch background. Both themes now use warmer shared tokens. The original Newsreader/DM Sans typefaces remain. Header controls are an animated sun/moon/system radio switch and a single quiet sound on/off switch; no volume slider is present. Sound uses short synthesized selection ticks after explicit opt-in, suspends when hidden, and reports playback failures without claiming it is on.

Simple choices advance automatically after a 280ms cue. Custom entries, model details, trade details, and incomplete contact information wait for completion. Back cancels pending advancement; arrow keys explore options without navigation and Enter confirms. Added segmented progress, a sticky mobile action bar, truthful draft-save status, inline field feedback, direct Review edit returns, and a copyable confirmation ID. A changed brand still requires its model before returning to Review.

Verification: type checks, lint, 27 unit/PostgreSQL tests, and the optimized build pass. The complete 52-test suite passed across Chromium, Firefox, WebKit, and mobile WebKit (2.4 minutes). After a final browser toolbar-color correction, all 12 affected theme, reflow, accessibility, and public-page checks passed again. Earlier checks caught invalid definition-list edit-button placement and transient text contrast during a fade; both were fixed. Tests also verify actual running Web Audio buffers, disabled sound, audio failure, cancelled advancement, storage denial, custom brands/budgets, and changing a brand from Review.

Final desktop/mobile screenshots in `screenshots/ux-enhancement` were inspected in both themes. `ux-visual-checks.json` records no script errors or horizontal overflow, animated gears that move normally and stop under reduced motion, and matching browser toolbar colors. All new component colors reference shared semantic roles.

Mobile localhost Lighthouse: performance 89, accessibility 100, best practices 96; LCP 3.7s, TBT 100ms, CLS 0. Report: `lighthouse-mobile-ux.json`. This lab result does not meet the designer's under-two-second LCP aspiration; mobile performance and real-device/VoiceOver checks remain release work. The photographs are existing generated prototype artwork and still require the release approval described above. Real database/email delivery, account eligibility, and production launch gates are unchanged.

Updated protected demo preview is READY: https://omni-timepieces-private-request-9l36jxsw5-watch-pro-academy.vercel.app (`dpl_JDhhyZ7mzhLX2fXo7EG4izMAkN1r`, application commit `4cd85f8`). Authenticated hosted checks confirm HTTP 200, server-rendered editorial directory, appearance and sound controls, automatic-choice guidance, and noindex. The synthetic hosted inquiry returned `accepted`, `preview:true`, and `DEMO-44C6137DA25C`; no real inquiry or email was created. Production was not promoted.

## Watch selection feedback — 9 October 2026

Replaced native datalists with shared themed editable pickers for models, references, years, dials, and corresponding trade fields. The menus show full suggestions on opening, filter typed text, expose selected values, support keyboard navigation, and keep “Other / enter manually” visible. Floating menus adapt to the viewport without shifting form controls; this fixes a Safari click loss observed with the first expanding-menu implementation. Model chips now have visible/accessible selected states.

Guidance actions have their own explanation and spacing. Choosing guidance visibly confirms that the model is left open, while watch tabs retain the brand and selected model or guidance status. Description edits discard stale guide suggestions. Applying a new suggested budget clears the previous minimum and replaces its maximum.

Verification: type checks, lint, 27 unit/database tests, and optimized build pass. All 60 browser checks passed across Chromium, Firefox, WebKit, and mobile WebKit (2.8 minutes). The final pinned manual-entry/outside-click refinement and added year/dial selection assertions passed 12 focused picker, guide, and multi-watch checks again (1.1 minutes). Open-picker accessibility checks passed in both themes. All four homepage image instances (three distinct watch images plus the shared background) loaded and decoded successfully in all browser projects. Desktop/mobile layouts were inspected in both themes; screenshots are in `screenshots/watch-pickers`. Production delivery and release gates remain unchanged.
