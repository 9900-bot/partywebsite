# Admin data governance

Day 5 establishes a private review architecture; it is not a secured production admin system. Authentication is not implemented. Future authorization should distinguish `admin`, `reviewer`, and `editor`, and every mutation must be enforced on the server and recorded in the audit log.

## Ingestion contract

Source → Import → Schema validation → Relationship validation → Duplicate detection → Review → Approval → Publication → Audit log

1. Register the authoritative source without assigning an automatic reliability score.
2. Create an import job. Its outcome must reflect what actually ran; queued work is never labelled successful.
3. Validate required fields, identifiers/slugs, dates, URLs, geography, parent relationships, duplicate IDs and scoped slugs, statuses, and provenance.
4. Invalid items remain outside the published repository and record an error.
5. Submit valid staged records for human review. Verification and review are independent.
6. Rejections require a reason. Approval does not imply verification.
7. Publication requires an approved record; verified records additionally require a registered source, valid source URL, and verification timestamp.
8. Record each transition in `audit_logs`. Until authentication exists, the only actor placeholder is `system`.

Automatic publication of unverified political or civic information is prohibited. Synthetic records must be explicitly labelled and are structurally ineligible for publication.

## Public/admin separation

`admin_records` and `import_jobs` are private staging areas with RLS enabled and no public policies. Public repositories must query only records whose review status is `approved` and publication status is `published`. The Day 4 communications repository applies this gate before returning records.

The local review buttons demonstrate the state machine in the current browser session only. They do not persist because authentication and trusted server-side mutation endpoints are intentionally deferred.

## Status models

- Review: `draft`, `pending_review`, `approved`, `rejected`, `archived`
- Verification: `verified`, `pending_verification`, `unavailable`
- Import: `queued`, `processing`, `completed`, `completed_with_errors`, `failed`
- Publication: `unpublished`, `published`

Source types are `government`, `election_authority`, `official_publication`, `official_website`, `dataset`, and `other`.
