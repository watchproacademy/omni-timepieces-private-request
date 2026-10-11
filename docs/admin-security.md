# Admin passkeys and private malware scanning

Migrations 008 and 009 are required before deploying this release. It adds passkey public keys, expiring challenges and enrollment hashes, an admin security audit, and file scan results. Existing owner sessions must sign in again. Customer email-link access is unchanged.

## Admin authentication

Every admin data route calls `accessFor`, which requires a current email-authenticated owner session **and** verified passkey. Device user verification is mandatory, challenge lifetimes are five minutes, challenges are consumed once, and verification rotates the session token without extending its original expiry. Exact `TRACKING_SITE_URL` origin and hostname bind passkeys; preview and production have distinct passkeys. Configure the stable branch URL, not an immutable deployment URL.

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

Deployment provisioning and gateway verification remain a release gate. These source changes alone do not create a private network or update the currently deployed preview. Do not switch off hosting protection for the internal deployment. No paid service is authorized.

### Staff project setup (2026-10-11)

- Project: `omni-private-desk` (`prj_FfeaneXFGG64gH5v9GK0Alo3Y6Wi`), Watch Pro Academy team.
- Vercel Authentication is enabled for **all** deployments. Anonymous checks on both page and API URLs redirected to Vercel login across the canonical address, deployment URL and project alias.
- Prepared preview address: `https://omni-private-desk.vercel.app/private-desk`.
- Preview database configured; email, private Blob, scanner and remaining server settings must be connected before operational testing. No production database/document-store connection is configured.
- The first CLI upload was treated as production by Vercel and failed the existing missing-configuration build guard. A subsequent explicitly staged deployment succeeded. Do not weaken that production guard.
- Newly scoped credentials and actual new-origin passkey enrollment remain release gates. Existing passkeys on the customer-preview hostname cannot authorize the new hostname.

### Operator request filters

Lists are server-filtered before pagination (50 per page), with matching counts. Dates use America/New_York, calendar weeks begin Monday, and past 14 days includes today. Custom dates are inclusive. Search matches customer name, public reference and all watches. Stage matches any watch in a multi-watch inquiry. Needs attention means submitted/in-review documents, an unpaid invoice stage, or a latest customer-visible message from the customer; internal notes do not count as a reply. All dates includes all retained inquiries, not purged records.
