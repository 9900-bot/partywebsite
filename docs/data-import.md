# Verified civic data import contract

This document defines column names for a future controlled import pipeline. It is not an import tool and contains no sample political records.

## Import order

Import parent records before their children:

1. states
2. districts
3. political_parties
4. assembly_constituencies
5. representatives

## Expected columns

### states

`id`, `name`, `code`, `type`, `slug`, `geojson_url`, `source_name`, `source_url`, `last_verified_at`

### districts

`id`, `state_id`, `name`, `code`, `slug`, `geojson_url`, `source_name`, `source_url`, `last_verified_at`

### political_parties

`id`, `name`, `abbreviation`, `slug`, `description`, `symbol_url`, `official_website`

### assembly_constituencies

`id`, `state_id`, `district_id`, `name`, `number`, `slug`, `geojson_url`, `source_name`, `source_url`, `last_verified_at`

### representatives

`id`, `constituency_id`, `name`, `party_id`, `position`, `status`, `term_start`, `term_end`, `source_name`, `source_url`, `last_verified_at`

## Validation requirements

- IDs must be stable and unique.
- Child foreign keys must resolve to an already imported parent.
- Slugs must be lowercase URL-safe values and unique within their parent scope.
- Constituency numbers must be positive integers and unique within a state.
- `party_id` must be null or resolve to a verified party record.
- Source URLs must use HTTP or HTTPS.
- Representative status must be `current`, `former`, `vacant`, or `unverified`.
- A representative may be shown as current only when the cited authoritative source supports that status.
- Importers must reject, rather than infer, missing political affiliations or representative identities.
