# OMNI TIMEPIECES — Private Request Funnel

A focused, one-screen-at-a-time luxury funnel for qualified private watch requests.

## Experience

The mobile-first experience opens with a cinematic introduction and moves into a nine-step concierge flow covering:

- Brand, model/reference, year, dial, occasion, condition, timeline, budget, trade-in, and contact/location
- Contextual bracelet/strap preference only for models where configuration can materially affect value
- Multi-watch trade-in appraisals with a separate year, dial, bracelet/strap, condition, set completeness, and expected value for each piece
- Brand- and model-aware browse lists for models, references, years, dials, and bracelet/strap configurations, with free-form entry for rare pieces
- Conditional detail fields when a client chooses an “Other / specific” material, strap, or trade-in presentation
- An “I’d like your guidance” path for clients who prefer to describe the watch naturally
- Maison-specific watch terminology and configuration logic for Rolex, Patek Philippe, Audemars Piguet, Richard Mille, Vacheron Constantin, F.P. Journe, and OMEGA
- Deliberate automatic progression after simple choices, with back navigation at every stage
- A final confirmation review with direct edit controls before submission
- USD-only budget and trade-in value handling
- Session-based progress saving and a no-page-scroll responsive layout
- Explicit consent for contact through the client’s selected method
- A post-submission prompt for trade-in photos when an appraisal is requested
- The $100M+ global inventory network, 24-hour capability, insured delivery, and service pillars
- A subtle animated mechanical-movement backdrop using replaceable placeholder photography
- A full-bleed mobile-app introduction with an animated balance wheel, escapement heartbeat, cinematic screen transition, and optional ticking sound
- A real contact-mic mechanical wristwatch recording during the opt-in cinematic introduction, fading to a soft mainspring-like resonance and restrained crown cues once the request begins
- Accessible Privacy and Terms dialogs for launch preparation
- Campaign attribution, URL prefilling, and analytics-ready funnel events

## Temporary imagery

Campaign images are stored in `assets/images/`:

- `hero-watch.jpg`
- `sport-watch.jpg`
- `dress-watch.jpg`
- `complication-watch.jpg`

They are original, unbranded concept images generated for the prototype. Replace each file with approved campaign photography using the same filename to update the site without changing the layout.

## Sound provenance

`assets/audio/mechanical-watch-loop.mp3` uses the public preview of “wristwatch,mechanical,clock,ticking,contact mic,loop,denoised.wav” by celesti-whispers from Freesound. The source recording is dedicated to the public domain under CC0 1.0. Interface crown and ratchet accents are generated locally with the Web Audio API and contain no third-party samples.

- Source: https://freesound.org/people/celesti-whispers/sounds/495889/
- License: https://creativecommons.org/publicdomain/zero/1.0/

## Request delivery

The completed form posts to `/api/watch-request`. The Vercel function supports either a generic webhook or Resend email.

### Webhook

- `WATCH_REQUEST_WEBHOOK_URL`
- `WATCH_REQUEST_WEBHOOK_BEARER` — optional

### Resend

- `RESEND_API_KEY`
- `WATCH_REQUEST_TO_EMAIL`
- `WATCH_REQUEST_FROM_EMAIL`

For a non-production demonstration, set `WATCH_REQUEST_PREVIEW_MODE=true`. Preview submissions are not delivered.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import it into Vercel using the `Other` framework preset.
3. Add one delivery configuration above.
4. Deploy and complete a real request test.

No build command or output directory is required.

## Campaign links and analytics

Ad and email links can prefill the request with `brand`, `model`, and `reference` query parameters.

Standard `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` values are captured with every request. Funnel events are pushed to `window.dataLayer` and also dispatched as `omni:funnel` browser events for later Google Tag Manager or analytics integration.
