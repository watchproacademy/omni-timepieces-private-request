# Admin passkeys and private malware scanning

Migrations 008 and 009 are required before deploying this release. It adds passkey public keys, expiring challenges and enrollment hashes, an admin security audit, and file scan results. Existing owner sessions must sign in again. Customer email-link access is unchanged.

## Admin authentication

Every admin data route calls `accessFor`, which requires a current email-authenticated owner session **and** verified passkey. Device user verification is mandatory, challenge lifetimes are five minutes, challenges are consumed once, and verification rotates the session token without extending its original expiry. Exact `INTERNAL_PORTAL_URL` origin and hostname bind staff passkeys; preview and production have distinct passkeys. Configure the stable branch URL, not an immutable deployment URL.

First enrollment additionally requires a 32-byte random one-time setup code, delivered outside email. Only its SHA-256 hash goes into `admin_enrollment` with the configured owner email and a short expiry. Initial enrollment consumes the hash atomically and is refused if that owner already has a key for this origin. Once verified, register a backup passkey through Admin security. No email-only reset or recovery bypass exists.

Lost-device recovery requires a separately verified operator and an explicitly approved maintenance operation: revoke owner sessions and old passkeys, then issue a new expiring setup code. Never perform recovery from an email request alone. Changes to the owner email also invalidate existing owner sessions. Passkeys for departed operators must be removed through controlled maintenance. No agents or additional reviewers are enrolled by this change.

## Malware scanning

Set server-only `CLOUDMERSIVE_API_KEY` in protected Preview and Production separately. User approved Cloudmersive free-plan processing of uploaded documents. Do not enable paid upgrades without approval. File bytes are sent only to `https://api.cloudmersive.com/virus/scan/file`; no public sample-sharing service or alternate endpoint fallback is used. Cloudmersive states its stateless APIs do not retain payloads after processing. This processor is disclosed in portal copy/privacy.

Uploads accept only the existing PDF/JPEG/PNG signatures and 3 MB maximum. The scanner must return HTTP success and boolean `CleanResult: true` within 20 seconds before storage. Quota failures, errors, malformed answers, and timeouts fail closed. Rejected uploads are not stored. Scanning is a defense, not a guarantee that every threat is detectable.

Legacy private files are marked unscanned by migration 008. Their first authorized download scans the bytes before any are returned. A threat sets the scan state to blocked; scanner failure leaves it unscanned. Database triggers prevent submission/approval and shipping while active, ready identity/address/business files remain unscanned or a required document type lacks a clean file. A blocked legacy file cannot satisfy a requirement; a clean replacement can. Open each legacy document and refresh before approval. There is no bypass button. Existing infected legacy records remain private under the retention policy and require controlled handling; they cannot be downloaded.

Before launch: configure the provider key, test one harmless clean fixture and EICAR test fixture, enroll the operator on their own device, verify a fresh email + passkey login, register a backup, and test direct endpoint denial using an email-only session. No real customer identity documents are needed for testing. Independent security review and final document-retention policy remain release requirements.


## Separate internal deployment (required)

Customer deployments default to customer-only mode. `/private-desk` and admin verification endpoints return 404. Owner login is rejected before issuing email; owner link exchange and existing owner sessions are rejected at the shared authorization boundary, including file and portal APIs. The customer login has no operator switch.

Prepare a **separate deployment/project** behind hosting authentication or an identity-aware access gateway. Verify that unauthenticated requests to every deployment alias and direct API URL are blocked by that gateway before enabling admin mode. A hidden URL or subdomain alone is not internal access protection. Do not enable admin mode on the public customer project.

Only that protected deployment receives `OMNI_PORTAL_MODE=internal` and an exact HTTPS `INTERNAL_PORTAL_URL`. Keep `TRACKING_SITE_URL` set to the customer site. Owner sign-in links go to the internal origin's `/private-desk`; customer links continue to the customer origin. Admin access additionally checks the exact request origin; other aliases fail closed. Keep the existing email and passkey requirements. New hostname means a new passkey enrollment on that hostname; old-host credentials are not transferable.

Production deployment provisioning and gateway verification remain a release gate. The isolated staff preview below is provisioned and protected; this is a staff-only website, not a private network. Do not switch off hosting protection for the internal deployment. No paid service is authorized.

### Staff project setup (2026-10-11)

- Project: `omni-private-desk` (`prj_FfeaneXFGG64gH5v9GK0Alo3Y6Wi`), Watch Pro Academy team.
- Vercel Authentication is enabled for **all** deployments. Anonymous checks on both page and API URLs redirected to Vercel login across the canonical address, deployment URL and project alias.
- Prepared preview address: `https://omni-private-desk.vercel.app/private-desk`.
- Preview database, private Blob connection, scanner key and staff rate-limit secret are configured. Blob remains private and is connected only for Preview on both projects. A separate sending-only Resend key scoped to omnitimepieces.com and sender settings are configured in Preview. The staff sign-in email was delivered and consumed successfully on the new hostname. The operator enrolled a device passkey on the new hostname and opened the dashboard. Live preview checks confirmed Today excludes the October 9 fixture and This month includes it. Both synthetic private files downloaded successfully, matched their original SHA-256 hashes, and were recorded clean after scanning. A customer-visible test message saved successfully, its delivery job reached sent on the first attempt, and the notification appeared in the controlled Gmail inbox at 6:37 PM Miami time. Staff staged deployment: dpl_91fnw9rWJKiegXmqYBp8UmUMk1ws; canonical alias omni-private-desk.vercel.app. Anonymous page/API requests redirect to vercel.com/sso-api. No production database/document-store connection is configured.
- The first CLI upload was treated as production by Vercel and failed the existing missing-configuration build guard. A subsequent explicitly staged deployment succeeded. Do not weaken that production guard.
- Preview credentials and new-origin enrollment are verified. Backup-passkey registration, independent security review, final retention policy, and production provisioning remain release gates. Existing passkeys on the customer-preview hostname cannot authorize the new hostname.

### Operator request filters

Lists are server-filtered before pagination (50 per page), with matching counts. Dates use America/New_York, calendar weeks begin Monday, and past 14 days includes today. Custom dates are inclusive. Search matches customer name, public reference and all watches. Stage matches any watch in a multi-watch inquiry. Needs attention means submitted/in-review documents, an unpaid invoice stage, or a latest customer-visible message from the customer; internal notes do not count as a reply. All dates includes all retained inquiries, not purged records.

### Custom staff address (prepared 2026-10-11)

`private-desk.omnitimepieces.com` is assigned and ownership-verified on the staff project. Authoritative DNS is Bluehost; the required new CNAME host is `private-desk`, pointing to `19deaf2a3240b56a.vercel-dns-017.com`. DNS is not yet configured. Preserve all existing storefront and email records.

Internal deployments rewrite `/` to the protected `/private-desk` page. This preserves the original host guard and does not change customer routing. Keep the current internal origin until DNS and HTTPS work; then set Preview `INTERNAL_PORTAL_URL` to the new HTTPS origin, redeploy staging, assign the custom alias, and verify anonymous page/API denial before enrollment. Do not promote or connect production data as part of this hostname change. The new hostname requires a new device passkey and one-time enrollment code.

### Production release preparation (2026-10-11)

User explicitly requested all portal upgrades on the actual production sites. Migrations 003–009 were first applied transactionally to production clone `br-lucky-glitter-b7r1nwqu` in project `plain-rain-52397004`, with all three inquiries preserved and assigned distinct public references, then applied successfully to production branch `br-empty-cloud-b7zvueut`. Private production Blob store `store_GAW766vx7aTDKb69` was created but is not connected. Automatic approval review blocked the production store connection pending explicit user authorization; production database/scanner connections for the staff project and a sending-only production staff email key are also awaiting requested approval. No new production deployment was promoted.

Admin list refresh now refetches the filtered page when Refresh updates is pressed. Type checks, lint, 53 unit tests, build, and the four-browser admin filter/refresh checks passed. Shopify credentials are required as a complete set only when configured, preserving the independent manual workflow. Staff root routing is prepared but not yet deployed to its canonical alias.
