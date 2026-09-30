# Communications data and provenance

Day 4 adds a read-only citizen-information catalog. It does not send SMS, email, WhatsApp, IVR, or phone communications. The application reads the bundled catalog through `lib/communications/repository.ts`; the SQL migration prepares the same model for a future verified import pipeline.

## Schema

Each record has a stable slug `id`, `title`, `summary`, `category`, geographic `scope`, optional `state`, `district`, and `constituency`, publication and update dates, a verification state, and source-provenance fields. Dates use ISO 8601 strings. Scope may be `national`, `state`, `district`, or `constituency`; narrower scopes require the complete parent hierarchy.

## Verification states

- `verified`: the source name, HTTP(S) source URL, and last-verified date are all required.
- `pending_verification`: the record has not passed provenance checks. Missing sources display “Source not yet established”.
- `unavailable`: the referenced information is known to be unavailable; it must not be used as a substitute for an unknown fact.

A status describes provenance confidence, not political importance or endorsement. No record should be promoted to `verified` merely because its wording appears plausible.

## Future imports

1. Acquire the item from an authoritative government or public source and retain its canonical URL.
2. Map it to the existing state → district → assembly constituency identifiers. Do not create representative or party relationships unless separately verified.
3. Normalize dates to ISO 8601 and populate `sourceName`, `sourceUrl`, `sourcePublishedAt` when known, and `lastVerifiedAt`.
4. Run `validateCommunications` before publishing. It rejects duplicate/invalid IDs, invalid enums, malformed dates or URLs, incomplete geography, and verified records without provenance.
5. Review the source manually, then set `verificationStatus` to `verified`. If a source cannot be established, retain `pending_verification` and null source fields.

Database imports should target `public.communications` from trusted server-side code. Row-level security is enabled and the migration intentionally creates no public write policy.
