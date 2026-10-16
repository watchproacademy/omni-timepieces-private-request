# Final transaction release reconciliation

Prepared from exact published UI commits: customer09d3020ff50d13feaf6a7ba6249c00e1b06b760d and operator26a84cf084825a3310657d59a502004d82538fdd. The reviewed transaction implementation fromb2627363328fe6ea31062e615d8c502ee149bc0d is restored on each role baseline. Operator direct passkey authentication remains unchanged; customer receives no operator-auth changes.

The workflow adds accepted-offer/invoice binding, private scanned evidence, explicit payment submission, manual exact-amount funds verification, manual KYC, gated shipment proof/dispatch, delivery and request closure, and optional protected possession photos. Existing UI improvements remain. Receipt evidence never clears funds. Shipment proof is operator-private until dispatch. Notifications exclude sensitive instructions and review notes.

Tests use synthetic fixtures and isolated SQL/provider substitutes. Live-provider checks require bounded allowance evidence; at most three dummy files <=100KB each and one harmless included scan are authorized. No customer records or notifications may be used for release tests.

User approved finalization/deployment on October16 after the UI-only release. Migration015 and activation remain gated on exact-commit CI, provider verification and correct target identity. Use only the dedicated transactional preservation migration; do not rerun the historical chain. Preserve all existing rows and private visibility. After enrollment retain workflow/audit rows and SQL gates during recovery; use a compatible rollback or forward fix.
