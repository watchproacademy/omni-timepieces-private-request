# Admin passkeys and private malware scanning

Migration 008 is required before deploying this release. It adds passkey public keys, expiring challenges and enrollment hashes, an admin security audit, and file scan results. Existing owner sessions must sign in again. Customer email-link access is unchanged.

## Admin authentication

Every admin data route calls `accessFor`, which requires a current email-authenticated owner session **and** verified passkey. Device user verification is mandatory, challenge lifetimes are five minutes, challenges are consumed once, and verification rotates the session token without extending its original expiry. Exact `TRACKING_SITE_URL` origin and hostname bind passkeys; preview and production have distinct passkeys. Configure the stable branch URL, not an immutable deployment URL.

First enrollment additionally requires a 32-byte random one-time setup code, delivered outside email. Only its SHA-256 hash goes into `admin_enrollment` with the configured owner email and a short expiry. Initial enrollment consumes the hash atomically and is refused if that owner already has a key for this origin. Once verified, register a backup passkey through Admin security. No email-only reset or recovery bypass exists.

Lost-device recovery requires a separately verified operator and an explicitly approved maintenance operation: revoke owner sessions and old passkeys, then issue a new expiring setup code. Never perform recovery from an email request alone. Changes to the owner email also invalidate existing owner sessions. Passkeys for departed operators must be removed through controlled maintenance. No agents or additional reviewers are enrolled by this change.

## Malware scanning

Set server-only `CLOUDMERSIVE_API_KEY` in protected Preview and Production separately. User approved Cloudmersive free-plan processing of uploaded documents. Do not enable paid upgrades without approval. File bytes are sent only to `https://api.cloudmersive.com/virus/scan/file`; no public sample-sharing service or alternate endpoint fallback is used. Cloudmersive states its stateless APIs do not retain payloads after processing. This processor is disclosed in portal copy/privacy.

Uploads accept only the existing PDF/JPEG/PNG signatures and 3 MB maximum. The scanner must return HTTP success and boolean `CleanResult: true` within 20 seconds before storage. Quota failures, errors, malformed answers, and timeouts fail closed. Rejected uploads are not stored. Scanning is a defense, not a guarantee that every threat is detectable.

Legacy private files are marked unscanned by migration 008. Their first authorized download scans the bytes before any are returned. A threat sets the scan state to blocked; scanner failure leaves it unscanned. Database triggers prevent submission/approval and shipping while active, ready identity/address/business files are unscanned or blocked. Open each legacy document and refresh before approval. There is no bypass button. Existing infected legacy records remain private under the retention policy and require controlled handling; they cannot be downloaded.

Before launch: configure the provider key, test one harmless clean fixture and EICAR test fixture, enroll the operator on their own device, verify a fresh email + passkey login, register a backup, and test direct endpoint denial using an email-only session. No real customer identity documents are needed for testing. Independent security review and final document-retention policy remain release requirements.
