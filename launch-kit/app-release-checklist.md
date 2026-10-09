# App migration release gates

This checklist separates implemented checks from external production verification. Do not label the app production-ready until the external gates have evidence.

## Account and infrastructure

- Confirm the hosting subscription permits this commercial use. Vercel Hobby is designated for personal, non-commercial use; the account was inspected and is active Hobby. The user declined a paid upgrade; commercial eligibility remains unresolved on this host. Do not assume the free account is eligible.
- Check current Vercel Queues operation allowances, function/cron limits, Neon database storage/compute quotas, and Resend email allowances. Each accepted request normally sends two emails, plus occasional alerts. Set provider spend limits/usage alerts and keep synthetic traffic isolated.
- Provision separate production and preview database environments. Confirm sender verification, SPF/DKIM/DMARC, recipient inboxes, receipt reply-to, and all server secrets.
- Apply the additive database migration to preview first, then production. Confirm queue trigger registration and daily maintenance authorization.
- Keep production public routes accessible without login or crawler challenges. Protect previews and ensure noindex headers.

## Acceptance evidence

- Run type checks, lint, unit/PostgreSQL tests, production build, and all browser projects.
- Review screenshots in both themes at desktop, narrow mobile, and zoomed/keyboard layouts; verify longer trade and review lists remain scrollable.
- Approve factual service and brand copy, Privacy/Terms, and licensed imagery. Existing generated placeholder images remain a release gate.
- In the isolated preview, submit a clearly marked TEST inquiry to controlled owner/customer inboxes. Verify matching request ID, owner HTML/text email, customer receipt, reply routing, independent job states, and provider acceptance. Deliberately fail one destination and confirm the other succeeds.
- Verify a failed save does not display success. Simulate queue publication failure and invoke maintenance with valid auth to recover the outbox.
- Verify failed/ambiguous delivery alerts and the hosting log alert policy. Check daily maintenance removes expired inquiries and hashed abuse records.
- Inspect initial HTML, canonical URLs, brand content, JSON-LD, social previews, sitemap, production crawler rules, and `/index.html` campaign redirects.
- Measure representative mobile pages with Lighthouse or PageSpeed. Targets: LCP <=2.5s, CLS <=0.1, INP <=200ms where measurable; no serious accessibility violations. Field results require actual traffic.

## Promotion and follow-up

- Preserve the current production deployment ID (`dpl_38T3jVQNXWoLydMCfeCwBSfrA6xi`, inspected during this migration) and record the migrated preview ID. Recheck the current production ID immediately before release. Do not change advertising budgets or campaigns.
- After preview gates pass, stage a production build with production configuration using `vercel deploy --prod --skip-domain`, verify that build, then promote its recorded deployment ID. Promoting a preview rebuilds it; it is not the same tested build. Inspect production navigation, public crawler access, API headers, and a clearly marked controlled end-to-end request; verify both emails and exactly one accepted inquiry.
- Verify Google tag loading and accepted conversion payload without contact details. Google acknowledgment/attribution is an external check, not implied by passing local tests.
- Verify ownership in Search Console, submit the production sitemap, and inspect representative URLs. Indexing and AI citations are not guaranteed.
- Inspect acceptance failures, queue backlog/job age, failed/ambiguous jobs, email outcomes, rate limits, cleanup, and service quotas after launch.

## Rollback and recovery

- Roll back to the recorded prior deployment if the migrated flow fails. Do not remove the additive tables; accepted inquiries remain recoverable.
- Existing legacy email/webhook handlers will not drain the new outbox. If rolling back, operate the verified worker deployment/maintenance endpoint separately until outstanding jobs resolve.
- Never log or export customer payloads to troubleshoot. Use request IDs and job/provider status.
- Failed jobs may be retried only after resolving the cause. Ambiguous jobs must be reconciled against provider records before resetting their state. Use the original provider key within its valid deduplication window.

Sources checked during implementation:
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/queues/pricing
- https://resend.com/docs/dashboard/emails/idempotency-keys
