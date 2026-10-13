# Phase-one negotiation review

Release candidate against published baseline `b8488e960106772ae4f784e8d467974bfa68be92`. Publication and counter deadline inheritance were approved on 2026-10-13. No real offer decisions, customer messages or later-phase rollout are part of publication.

## Agreement rules

- One immutable offer covers all items in one reviewed published quote. An operator must explicitly open it and assent; existing quotes/stages never imply assent.
- The operator confirms all source PDF conditions, currency, item identities/descriptions, quantities, unit prices, fees, total, payment terms and any stated due date. Delivery terms are explicitly entered; unknown terms remain subject to confirmation. No public processing/dispatch promise is inserted.
- Customer acceptance confirms agreement for that exact revision. Customer-facing copy says “Offer accepted”; the internal Mazal designation appears only inside operator decision history. A price counter preserves every item, quantity, fee, currency, payment and delivery term. Per-item unit prices avoid ambiguous allocation or rounding across a basket. Customer explicitly assents if the operator accepts unchanged.
- Operator counter acceptance confirms agreement; rejection closes only that revision. Changes require a newly reviewed PDF/quote and fresh customer assent. Existing originals are never relabeled as counter PDFs or rewritten.
- Every operator quote has the existing exact 48-hour deadline from confirmed issuance. Future issuance cannot open an offer yet. Expired revisions cannot be accepted/countered/declined. A customer counter inherits the parent quote deadline, without an extension. This policy was explicitly approved for publication.
- Publishing a newer quote supersedes overlapping pending offers atomically. This includes an outstanding counter. Already agreed items cannot be opened for a second agreement; amendments/cancellations need a later explicit workflow.
- A timely agreement remains recorded after the historical quote deadline. It never records payment, KYC clearance or shipment.

## Boundaries and evidence

Existing authenticated request access and operator passkey/origin boundaries are reused. Customer scope and action role are checked before mutation and again by the SQL transition. CSRF/origin, body limits, strict input validation, rate limits, private file access and malware scan requirements remain in force.

The request row serializes commercial publication and offer decisions. The deadline uses the database clock **after** lock acquisition. Expected versions and stored idempotency inputs prevent stale overwrites and duplicate decisions. Terms snapshots cannot be updated; source document version and SHA-256 file hash are retained. Terms fingerprints are comparison/audit identifiers, not authentication signatures. Actor session fingerprint, authenticated identity, timestamp, reason, immutable revision and complete idempotency input are recorded. Audit events and queued notifications are in the same transaction.

Agreement snapshots survive individual source-file expiry and remain under the existing request retention/deletion guard. Request deletion cascades offers, decisions and history. No new retention period is introduced. Customer responses omit internal actor fingerprints and operator identities. Shared decision reasons are clearly labeled in the UI.

Notifications reuse branded templates, recipients, delivery idempotency and private links. A fresh sign-in email preserves `request` plus `section=negotiation` through access exchange and operator passkey verification; wrong-request responses are rejected. No attachments/terms are sent by email. Sending success is never inferred from queue creation.

## Review and publication gates

1. Counter deadline inheritance and customer/operator copy approved on 2026-10-13.
2. Desktop/mobile flow and publication approved; preserve the neutral customer wording.
3. After separate publication authorization: test additive migration 013 against an isolated schema/branch, verify existing rows unchanged, commit reviewed files, run exact-commit CI and stage both sites.
4. Apply **only the reviewed migration 013** in an approved transaction with pre/post preservation checks; do not casually rerun historical migrations in production.
5. Set `NEGOTIATION_ENABLED=true` for both sites only with migration installed and the counter policy approved; existing commercial/portal flags remain required. Promote approved deployments, then verify authenticated boundaries and branded deep links read-only. Feature defaults off; no retrospective backfill.

For rollback, disable `NEGOTIATION_ENABLED` and restore prior site deployment if needed. Keep any real agreed terms/audit records; never delete decisions to undo deployment. Migration's quote-publication trigger continues protecting pending offers against supersession even while UI is disabled.

## Later phases

Business timing is a quiet, flexible internal estimate: about three business days from cleared funds through KYC, within an overall funds-to-dispatch estimate of up to seven business days. It is not a public SLA, delivery promise, countdown or enforced transition rule. No timing mechanics or automatic KYC clearance are added in phase one. No automatic payment clearance, KYC decision, shipping policy, financial integration, AI or paid service is added.

These internal estimates do not change offer deadlines. Exact 48-hour quote expiry remains unchanged. Counter deadline inheritance and phase-one publication were explicitly approved; later phases remain outside this release.
