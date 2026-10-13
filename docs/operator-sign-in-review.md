# Operator sign-in: final design and authentication review

Unpublished implementation against `0cefa450cafc8c3b46c1246ee49cb01c6c5fc643`. The user explicitly approved direct passkey sign-in; publication remains unapproved. Customer sign-in, operator allowlisting, canonical domain, enrollment/recovery policy and existing workspace actions remain unchanged. No production schema/configuration, real credentials or client records were changed.

## Compact access layout

The centered panel uses the existing Omni typography, colors, sound and appearance controls. Mobile branding and controls share a shorter header. One concise instruction explains email access; the redundant Authorized operators / Your next step footer is removed. Link expiry, spam-folder troubleshooting and older-key guidance sit in a keyboard-accessible disclosure.

The ready email field, direct-passkey action and email-submit button fit together at 375×667 and 390×844 without scrolling. At 320×568, natural scrolling preserves readable text and controls. Captures explicitly wait for the enabled email button, `aria-busy=false` and removal of the checking notice; they do not mistake server-rendered loading for settled login. Pending checks/actions disable conflicting controls. Native email validation, generic sent-link feedback and draft-preserving retry remain intact.

## Implemented direct authentication

`POST /api/request-status/admin/login` supports only `options` and `verify`. It is available only on the configured HTTPS internal origin, validates exact Origin/Host and rejects cross-site requests, non-JSON input, malformed/oversized bodies, identifiers and registration arguments.

Options return an accountless challenge with an empty `allowCredentials` list and required user verification. They do not query enrollment or registered credentials, and return the same option structure when there are no keys or no configured owner. No anonymous email lookup or single-operator credential-list route was added.

A 32-byte random browser nonce is sent only in a host-only HttpOnly, SameSite=Strict cookie, Secure in production, scoped to this endpoint and expiring after five minutes. Its hash binds a stored challenge to owner configuration, RP and origin. New options with the same browser nonce replace the preceding challenge. Verification atomically deletes the challenge before credential/signature validation; expired, malformed, failed and replayed attempts cannot reuse it. The browser prompt timeout is 60 seconds; the stored challenge expires after five minutes.

The returned credential must exist for the exact currently allowlisted owner and RP. Signature verification checks the stored public key/counter, challenge, exact origin/RP, user presence and required user verification. Embedded assertions (`crossOrigin=true` or any `topOrigin`) are explicitly refused, including a Safari/library case that would otherwise accept an embedded assertion without topOrigin. The assertion's `userHandle` must equal the base64url SHA-256 of the normalized configured owner, matching existing enrollment's user ID. Missing or mismatched handles fail; the current enrollment path uses this mapping.

After cryptographic verification, the handler rechecks current owner/origin configuration. A database function locks the owner and rechecks the exact credential ID, owner, RP, public key and previous counter, so revocation, replacement or counter changes between read and completion fail closed. It updates the counter, creates a verified owner session, removes the browser's prior matching owner session and appends a security event in one transaction. No session is issued from options, email identity or an unverified assertion.

## Session, revocation and fallback semantics

A successful fresh passkey sign-in creates one absolute 60-minute session, with a random rotated token and the existing HttpOnly, Secure-in-production, SameSite=Strict cookie at `/api/request-status`, Max-Age=3600. It is not a sliding or remembered session. A failed sign-in sends no session-cookie change and preserves an existing session. An expired or pending owner cookie grants no direct-login authority; only the new verified assertion does. Successful login removes that prior matching owner row atomically.

The existing email-link route remains a fallback that requires **email link plus passkey**. Links are single-use and expire after 15 minutes; exchange creates a one-hour pending session, and passkey verification rotates its token while preserving its original absolute expiry. No email-only recovery bypass was introduced.

Initial registration still requires the email-confirmed owner session and a valid one-time setup code when no key exists. Backup enrollment still requires an already MFA-verified owner session. The new endpoint has no registration action and cannot add keys. Existing valid verified sessions continue to open the workspace automatically. Request/message/offer return targets continue through the existing guarded loader; mismatched responses are refused.

Deleting/replacing a credential blocks new authentication, including a race during completion. It does not retroactively invalidate other already issued owner sessions; logout/revocation of the session row, absolute expiry or removal/change of the current owner allowlist denies those sessions under the existing policy. This work does not add a credential-management UI or change that policy.

## Credential compatibility and live metadata

A read-only production query returned one registered credential for `omni-private-desk.vercel.app`. Only aggregate count and schema column names were read: `id`, `owner_email`, `rp_id`, `public_key`, `counter`, `transports`, `created_at`. No credential IDs, public keys, contact values, transports or device details were read. There is no persisted discoverability, backup/device type or user-handle metadata.

The enrollment code requests `residentKey: required`, so a key enrolled through the current code is expected to be discoverable. That code setting and stored count do not prove the particular historical credential's discoverability or availability/synchronization on the user's current device. Its direct-login usability remains unknown until the user tries it. No biometric prompt, real enrollment, replacement or synchronization change was performed.

Direct login uses discoverable credentials. Existing non-discoverable credentials remain compatible through the email-confirmed flow's explicit `allowCredentials`; they are not exposed anonymously. Supporting non-discoverable keys in a direct identifier-first flow would require a separate privacy/security design. No such lookup was introduced. The canonical origin/RP remains `https://omni-private-desk.vercel.app`; the branded entry redirects there. No domain migration, provider, fee, allowlist expansion or credential conversion is included.

## Abuse and enumeration review

Rate windows live in the existing database rather than per-process memory. Each options/verify request counts against 60 requests per trusted Vercel IP per hour and 300 requests across the deployment per hour. Changing caller cookies cannot reset them. Missing trusted IPs share an `unknown` bucket; local tests use a local bucket. A full successful ceremony consumes two requests. Exhausted limits return a generic 429 and can temporarily block legitimate direct sign-in until the fixed window expires; the independent email-plus-passkey path remains available.

Unknown credential IDs follow the same signature-verification path with a valid dummy public key, but a stored matching key is mandatory for authorization. Invalid assertions share one generic 403, no session cookie and a 250ms minimum response duration. These measures reduce common enumeration signals; they are not a claim of constant-time behavior under every database, algorithm or cold-start condition. There is no anonymous operator/account identifier or credential-list endpoint to enumerate.

## Migration preservation and rollback

Migration 014 creates only `admin_login_challenges`, its expiry index and `complete_admin_passkey_login`. It does not alter existing tables, constraints, triggers, enrollment or `complete_admin_passkey`, and does not enroll, rewrite or remove existing keys/sessions while migrating. It adds no role grants and uses normal invoker privileges. The migration runner includes it after 013.

It is idempotent and was verified on an isolated PGlite database and the already existing Neon test branch `br-wandering-dream-b7sl57rb`, as `omni_concierge_owner`. Synthetic PostgreSQL fixtures verified one-hour session creation, rotation, stale counters and revocation, then rolled back. Existing key/session fingerprints matched before and after; no synthetic keys/sessions remained. Two parallel PostgreSQL challenge deletes produced exactly one winner.

A code rollback to the baseline can leave this additive table/function in place. The old application ignores them and still recognizes newly issued verified sessions because their schema and cookie are unchanged; the email-plus-passkey fallback/enrollment remains usable. No destructive down migration is required for a code rollback. Unconsumed direct-login challenges expire after five minutes and are inert if the direct endpoint is removed. Apply 014 before serving the new endpoint during a separately approved release; it has not been applied to production.

## Verification and review deliverables

Build, ESLint, Next route generation and TypeScript pass. All 93 unit tests and 92 browser checks pass across Chromium, Firefox, WebKit and the iPhone project. Security checks use real synthetic signatures and isolated data; browser WebAuthn success/cancellation is simulated and does not exercise the user's actual biometrics or credential availability.

The matrix covers native validation, loading completion, duplicate prevention, retained-email errors/retries, generic sent state, direct authentication/cancellation and conversation returns, existing email offer/message links, request selection/filter navigation, enrollment gates, both-theme WCAG checks and operator/customer flows. Final preservation checks also verify failed-login session retention and fallback enrollment/absolute-expiry behavior after migration 014.

Eight sanitized review images show settled login, sent, error and existing email-confirmed passkey states at 1280×720 and 390×844, with no horizontal overflow. All are saved as version 1 of the original Library items; identities are in `artifacts/operator-sign-in/library-review-files.json`. Final verification is recorded in `artifacts/operator-sign-in/final-verification.json`.

Local design review: `http://127.0.0.1:3034/private-desk?previewState=login`. All APIs there are mocked: it cannot authenticate, send email, enroll credentials or modify records. The user's local Chrome preview is retained, with no temporary viewport override. Source changes remain uncommitted and unpublished for review. Unrelated `CLAUDE.md` and existing artifacts are preserved.

Reference: [SimpleWebAuthn passkeys and challenge management](https://simplewebauthn.dev/docs/advanced/passkeys).
