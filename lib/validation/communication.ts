import type { CivicCommunication, CommunicationScope, CommunicationVerificationStatus } from "@/types/communication";

const statuses = new Set<CommunicationVerificationStatus>(["verified", "pending_verification", "unavailable"]);
const scopes = new Set<CommunicationScope>(["national", "state", "district", "constituency"]);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reviewStates = new Set(["draft", "pending_review", "approved", "rejected", "archived"]);
const publicationStates = new Set(["unpublished", "published"]);

function isDate(value: string | null) { return value === null || !Number.isNaN(Date.parse(value)); }
function isUrl(value: string | null) { if (value === null) return true; try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Invalid communication data: ${message}`); }

export function validateCommunications(records: CivicCommunication[]): CivicCommunication[] {
  const ids = new Set<string>();
  for (const record of records) {
    assert(idPattern.test(record.id), `invalid id: ${record.id}`);
    assert(!ids.has(record.id), `duplicate id: ${record.id}`);
    assert(record.title.trim() && record.summary.trim() && record.category.trim(), `required fields missing: ${record.id}`);
    assert(scopes.has(record.scope), `invalid scope: ${record.id}`);
    assert(statuses.has(record.verificationStatus), `invalid verification status: ${record.id}`);
    assert(reviewStates.has(record.reviewStatus), `invalid review status: ${record.id}`);
    assert(publicationStates.has(record.publicationStatus), `invalid publication status: ${record.id}`);
    assert(record.publicationStatus !== "published" || record.reviewStatus === "approved", `published record is not approved: ${record.id}`);
    assert(isUrl(record.sourceUrl), `invalid source URL: ${record.id}`);
    assert([record.publishedAt, record.updatedAt, record.sourcePublishedAt, record.lastVerifiedAt].every(isDate), `invalid date: ${record.id}`);
    if (record.verificationStatus === "verified") {
      assert(record.sourceName && record.sourceUrl && record.lastVerifiedAt, `verified record lacks provenance: ${record.id}`);
    }
    if (record.scope === "district" || record.scope === "constituency") assert(record.state && record.district, `district scope is incomplete: ${record.id}`);
    if (record.scope === "constituency") assert(record.constituency, `constituency scope is incomplete: ${record.id}`);
    ids.add(record.id);
  }
  return records;
}
