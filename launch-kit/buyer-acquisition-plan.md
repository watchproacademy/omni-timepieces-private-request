# Omni Timepieces — buyer acquisition launch kit

Prepared October 1, 2026. Draft for review; no campaigns, posts, or messages have been published.

## Objective and decisions

Bring in reachable buyers who want a specific watch, have a workable budget, and intend to purchase soon. Prioritize purchases; trade-ins may support a purchase.

LATEST OWNER INSTRUCTION: prepare the campaign, but do not run it before separate confirmation. Initial test range is now $15–$50 total; prepare $15 total at the low end. This replaces the earlier $500 launch recommendation. The previous $500–$1,500 monthly range is a possible later discussion, not current spending authorization.

Confirmed targeting: United States only; focus on smaller markets outside major watch hubs, with Miami, Los Angeles, and New York excluded. Confirmed brands: Rolex, Audemars Piguet, and Patek Philippe.

Recommendation: concentrate the first month's paid budget on one Google Search campaign with three brand ad groups, supported by organic Instagram content and personal referrals. Start with Northwest Arkansas; consider Boise/Eagle as the second cluster after reviewing search forecasts. Huntsville/Madison is a reserve candidate. These are test hypotheses, not proven low-competition markets. See [the sourced market brief](us-market-targeting.md). Model choices below are examples from the site's catalog, not demand forecasts. Choose references with competitive sourcing, reliable availability, and sufficient contribution margin.

| Budget stage | Scope |
| --- | --- |
| $15 total, proposed first test | Bentonville/Rogers; one campaign with three brand ad groups; draft only until confirmed |
| Up to $50 total | Possible later test after reviewing initial results and getting a new approval |
| Larger monthly budget | Revisit only after the owner chooses to expand |

These amounts are advertising spend only. Platform forecasts and observed results must determine whether the budget produces enough traffic to evaluate. No lead-count or sales forecast is assumed. Do not increase spending automatically.

For the initial test, prefer Google's Campaign total budget over three days, if the account accepts a $15 total. It is a campaign spending cap, unlike an average daily budget. Set actual dates only when launch is approved, and retain the draft/paused state until then. If unavailable or rejected, report the issue without substituting an unbounded daily campaign. [Google campaign total budgets](https://support.google.com/google-ads/answer/10486938?hl=en_US)

At $15, the objective is an initial check of eligible traffic and the funnel experience. Few or zero clicks or leads would not establish that the offer works or fails. The test will not reliably compare all three brands or measure acquisition profitability.

## What was examined

- The live concierge site loaded, and the Rolex brand selection advanced to the model/configuration screen. The desktop presentation was visually inspected.
- The local nine-step funnel captures watch details, condition, timing, budget, trade-in preferences, and contact/location details.
- Existing code supports brand/model/reference prefilling and basic campaign attribution.
- Live HTML contains the app script without an obvious Google or Meta tag. Local code emits events but does not show a connected analytics destination; its content security policy also needs review when connecting tags.
- This was not a complete mobile or submission test. Production request delivery, account configuration, and any external CRM automation remain unverified.

## Before paid traffic

1. Confirm an end-to-end production request reaches the person responsible for responding. Label any agreed test clearly and verify receipt, not just the success screen.
2. Connect analytics and ad conversions. Measure request starts, step progression, successful server-confirmed submissions, and errors. A request-button click alone must not count as a lead.
3. Preserve campaign, ad, keyword, and relevant ad-click identifiers with the lead. Current code has dedicated source/medium/campaign fields; content and term are only indirectly retained in the landing URL. Analytics integration should not send contact information in ordinary analytics events.
4. Store each inquiry in a lead pipeline with an owner and a next action. Confirm whether the existing webhook already provides this before adding another system.
5. Establish a response target the desk can maintain. Proposed target: a personal response within 15 minutes during staffed campaign hours, with clear expectations outside them.
6. Check the full flow on a phone. Use step drop-off data to decide whether the form needs shortening; do not assume nine steps alone is a problem.

## Paid search campaign draft

Working name: `OMNI | US Secondary Markets | Buyer Search`.

Use a focused Search campaign. Begin with exact and phrase keywords, then review the actual searches that generated clicks. Exact match can include searches with the same meaning or intent. Add only selected U.S. city targets, using presence targeting rather than interest in those locations. Do not add the entire United States as a positive location target: that would broaden delivery beyond the selected cities. Resolve city and exclusion boundaries in the account; exclude the Miami, Los Angeles, and New York metro areas. Keep Display expansion and separate paid social acquisition outside this initial test.

All three brands share the campaign's budget. Do not describe brand percentages as enforced ad-group budgets. Review spend by brand so one does not consume the test unnoticed. At $15, some groups may receive no traffic. Use keyword forecasts before activation and propose any expansion for review; never expand geography or budget automatically.

Sources: [Google keyword matching](https://support.google.com/google-ads/answer/7478529?hl=en), [Google location targeting](https://support.google.com/google-ads/answer/9376662?hl=en).

### Ad group A: Rolex

Keyword candidates:

- `[buy rolex submariner]`
- `"rolex submariner for sale"`
- `[buy rolex gmt master ii]`
- `"rolex daytona for sale"`

Reference-specific keywords may be added when sourcing and pricing are confirmed.

Headline assets:

- Find Your Next Rolex
- Omni Timepieces Concierge
- Request Your Exact Watch
- Tell Us Your Configuration
- Private Rolex Sourcing
- Start Your Private Request

Description assets:

- Tell us your reference, budget and timing. Our private desk will review your request.
- Searching for a Rolex? Share your preferences and discuss sourcing with our team.

Brand-level destination:

https://concierge.omnitimepieces.com/?brand=Rolex&utm_source=google&utm_medium=cpc&utm_campaign=us_secondary_buyers&utm_content=rolex

### Ad group B: Audemars Piguet

Keyword candidates:

- `[buy audemars piguet royal oak]`
- `"audemars piguet royal oak for sale"`
- `[buy audemars piguet]`

Avoid the abbreviation AP on its own; it has unrelated meanings. Add Royal Oak Offshore only if commercially appropriate.

Headline assets:

- Find Your Audemars Piguet
- Omni Timepieces Concierge
- Request Your Exact Watch
- Royal Oak Sourcing
- A Personal Watch Search
- Start Your Private Request

Description assets:

- Seeking a Royal Oak? Tell us your reference, budget and timing. Start a private request.
- Explore Audemars Piguet sourcing with Omni. Personal guidance for your next watch.

Brand-level destination:

https://concierge.omnitimepieces.com/?brand=Audemars%20Piguet&utm_source=google&utm_medium=cpc&utm_campaign=us_secondary_buyers&utm_content=audemars_piguet

### Ad group C: Patek Philippe

Keyword candidates:

- `[buy patek philippe nautilus]`
- `"patek philippe aquanaut for sale"`
- `[buy patek philippe]`

Nautilus and Aquanaut are initial keyword candidates, not evidence of available inventory. Add other collections based on sourcing strength and search forecasts.

Headline assets:

- Find Your Patek Philippe
- Omni Timepieces Concierge
- Request Your Exact Watch
- Private Patek Sourcing
- A Personal Watch Search
- Start Your Private Request

Description assets:

- Looking for a Patek Philippe? Tell us your model, budget and purchase timing.
- Request private sourcing for your next watch. Our team will review your brief personally.

Brand-level destination:

https://concierge.omnitimepieces.com/?brand=Patek%20Philippe&utm_source=google&utm_medium=cpc&utm_campaign=us_secondary_buyers&utm_content=patek_philippe

These ads advertise a sourcing request. They make no unverified promise of stock, pricing, brand authorization, or guaranteed delivery. Final assets and destinations still need review inside the ad account. Keep each brand's assets in its own group. The initial destinations prefill only the brand; model-specific ads can prefill the matching model, and reference-specific ads can prefill that reference. The ad and destination should always match. Tracking and location exclusions still require implementation and verification in the account.

### Negative keyword candidates

Start with obviously irrelevant intent: replica, replicas, fake, fakes, superclone, superclones, wallpaper, wallpapers, manual, manuals, jobs, careers, repair, repairs. Review negative match types before applying. Add sell-only phrases if they occur and are irrelevant to buyer acquisition.

Do not blanket-exclude price, cost, used, pre-owned, or trade-in: those searches can come from buyers. Avoid excluding all research words without looking at the full query.

## Organic launch copy

Use real watch footage, actual sourcing examples, and customer proof used with permission. Link from the Instagram bio, a pinned post, and Stories. The examples below are drafts for the owner to publish or authorize later.

### Pinned launch post

**Your next timepiece starts with a conversation.**

Looking for a Rolex, Audemars Piguet, or Patek Philippe? Omni Timepieces' private concierge lets you tell us exactly what you're looking for—from the model and dial to your budget and timing.

Our team reviews your request and works through our dealer network to locate suitable options. Start the search from wherever you are in the United States.

Start your private request through the link in our bio.

### Three-frame Story

1. **Know the watch you want?** Show a real watch or an approved close-up.
2. **Tell us the model. Your budget. Your timing.** Show the request flow.
3. **Let our private desk take it from here.** Link sticker: “Request your watch.”

### Short video script

“Looking for a specific watch? Send us the model, the configuration you want, and your budget. Through Omni's private concierge, our team can review your request and search our dealer network for suitable options. Start through the link in our bio.”

### Personal referral draft

“We've launched Omni's private watch concierge. If someone you know is ready to buy and has a particular watch in mind, they can send us their model, budget, and timing here: [tracked link]. We'll review the request personally.”

Use with relevant existing relationships; this is not authorization to send or a recommendation for bulk unsolicited outreach. Each referring partner should have a distinct source value for attribution.

Instagram bio tracking link:

https://concierge.omnitimepieces.com/?utm_source=instagram&utm_medium=organic_social&utm_campaign=buyer_launch&utm_content=bio

## Lead handling

Suggested pipeline: New → Contacted → Qualified → Options presented → Decision pending → Won / Lost. Keep longer-timeline inquiries in a separate follow-up category.

Record request ID, received time, campaign/source, requested watch, budget, timeline, contact preference, assigned owner, last contact, next action/date, outcome, and loss reason. Keep customer details in an access-controlled CRM or tracker.

For this test, count a qualified buyer when all of the following are confirmed:

- Reachable and engaged in a real conversation.
- Specific model or a clear brief the desk can fulfill.
- Budget fits an available option or the buyer is willing to adjust.
- Intends to purchase within approximately two weeks.
- Located in a market the business can serve.

Do not count every submission as a qualified lead. Longer-timeline clients still have value, but report them separately.

### Initial reply draft

“Hi [first name], this is [name] at Omni Timepieces. I received your request for [watch]. You mentioned [budget] and [timing]. Is [key configuration detail] essential, or would you consider alternatives? I'll use that to narrow the search.”

### Follow-up draft

“Hi [first name], following up on your [watch] request. Are you still looking to purchase within [timing]? Let me know if your preferred configuration or budget has changed.”

Use the client's selected contact method and keep messages specific to the request. Proposed cadence: initial response, a relevant follow-up the next business day, and a final check-in later that week if appropriate. Stop if the client declines further contact. Never claim options have been found until they have.

## First 30 days

| Period | Work | Decision |
| --- | --- | --- |
| Days 1–3 | Verify receipt and tracking, check forecasts for shortlisted cities/brands, prepare account draft | Ready to launch after owner approves final spend/settings |
| Days 4–7 | Publish approved launch content and run the focused campaign | Check search relevance, errors, and response speed |
| Week 2 | Review queries and lead quality; follow up with every active inquiry | Remove irrelevant traffic and investigate drop-off |
| Weeks 3–4 | Compare brand groups and city clusters, conversations, quotes, and sales | Continue, revise, or pause based on evidence |

Track spend, clicks, starts, completed requests, qualified buyers, quotes, sales, and contribution margin after acquisition cost. Calculate cost per qualified buyer as spend divided by qualified buyers; if there are none, report zero qualified buyers rather than a misleading cost figure.

Once sufficient confirmed lead outcomes exist, feed qualified/converted lead outcomes back into Google Ads. [Google's qualified lead measurement guidance](https://support.google.com/google-ads/answer/15707550?hl=en) supports measuring these deeper outcomes.

Choose an acceptable acquisition cost from actual margin and observed close rate. Do not scale merely because submissions are inexpensive. A small sample or an incomplete sales cycle may require more time before drawing conclusions; any additional spend requires a deliberate decision.

## Inputs still needed

- Separate final confirmation to activate the proposed $15 total test and choose its dates.
- Existing Google Ads/analytics/CRM setup and who will answer leads.
- References with the strongest sourcing, pricing, and margin within the three confirmed brands.

Country, brand scope, and the preference for smaller markets are confirmed. The proposed city shortlist is ready for keyword forecasting; do not treat missing forecasts as proof of low competition or low costs.

The next implementation step is connecting measurement and verifying delivery, then preparing the final campaign in the chosen account. No advertising spend, site changes, or external outreach has been initiated by this launch kit.
