# Portal preview verification — 2026-10-11

Code tested: `6a6594b` on `codex/customer-operator-portals`.
Environment: protected Vercel preview, isolated Neon database, private preview Blob store.
Fixture: existing synthetic Rolex inquiry ending `152BC70D543D`. Only a clearly marked synthetic PDF was uploaded; no real identity documents or payments were used.

Verified through the deployed UI and database:

- Owner and customer email-link sign-in; expired links rejected.
- Shipping before transaction-review approval rejected.
- Simulated payment saved for the watch; document request saved.
- Owner invoice uploaded to private storage and downloaded byte-for-byte intact.
- Unauthenticated invoice request returned HTTP 401 despite passing hosting protection.
- Internal note persisted without customer notification and was absent from the customer dashboard.
- Customer identity fixture uploaded, review form submitted, and customer message saved.
- An operator action from a stale operator tab was rejected after switching to a customer session.
- Approval without the operator review attestation rejected; attested synthetic approval saved.
- Shipment with a clearly fake carrier/tracking number allowed after recorded payment and approval.
- Ten total delivery jobs for this inquiry (including the two original receipt/inquiry jobs) were sent; none pending, failed, or ambiguous at the final check.
- Full GitHub CI matrix passed: Chromium, Firefox, WebKit, mobile WebKit. This includes build, type checking, lint, unit tests, and portal accessibility in both themes.

## Release gates still open

Production portal document collection remains disabled. Migration 003 has only been applied to the isolated preview database. The user approved production migration after preview testing; it is deferred pending the retention design below.

Confirm and implement separate retention rules for buyer verification, secondhand acquisitions/trade-ins, and invoices before enabling production collection. The preview's one-calendar-year-from-upload expiry is a business test setting, not a legal compliance determination. No production data or real shipment was changed in this test.

Uploads are signature-checked PDF/JPEG/PNG files delivered as attachments; automated malware scanning is not implemented. A real Shopify payment/fulfillment cycle remains untested. Shopify is optional and does not override manual shipment approval.
