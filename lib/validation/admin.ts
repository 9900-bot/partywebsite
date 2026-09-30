import type { AdminGovernanceData, AdminRecord, ImportStatus, ReviewStatus, SourceType } from "@/types/admin";

const reviews = new Set<ReviewStatus>(["draft", "pending_review", "approved", "rejected", "archived"]);
const verification = new Set(["verified", "pending_verification", "unavailable"]);
const sourceTypes = new Set<SourceType>(["government", "election_authority", "official_publication", "official_website", "dataset", "other"]);
const importStates = new Set<ImportStatus>(["queued", "processing", "completed", "completed_with_errors", "failed"]);
const auditActions = new Set(["created", "imported", "edited", "submitted_for_review", "approved", "rejected", "archived", "restored"]);
const geographicScopes = new Set(["none", "national", "state", "district", "constituency"]);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isDate = (value: string | null) => value === null || !Number.isNaN(Date.parse(value));
const isUrl = (value: string | null) => { if (value === null) return true; try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(`Invalid admin governance data: ${message}`); }

export function validateAdminRecord(record: AdminRecord, sourceIds: Set<string>) {
  assert(idPattern.test(record.id), `invalid record id ${record.id}`);
  assert(idPattern.test(record.slug), `invalid record slug ${record.id}`);
  assert(record.title.trim() && record.recordType.trim() && record.geographicScope.trim(), `required record fields missing for ${record.id}`);
  assert(reviews.has(record.reviewStatus), `invalid review status for ${record.id}`);
  assert(geographicScopes.has(record.geographicScope), `invalid geographic scope for ${record.id}`);
  assert(verification.has(record.verificationStatus), `invalid verification status for ${record.id}`);
  assert(isUrl(record.sourceUrl), `invalid source URL for ${record.id}`);
  assert([record.createdAt, record.updatedAt, record.lastVerifiedAt].every(isDate), `invalid record date for ${record.id}`);
  assert(!record.sourceId || sourceIds.has(record.sourceId), `unknown source for ${record.id}`);
  if (record.verificationStatus === "verified") assert(record.sourceId && record.sourceUrl && record.lastVerifiedAt, `verified record lacks provenance: ${record.id}`);
  if (record.reviewStatus === "rejected") assert(record.rejectionReason?.trim(), `rejected record lacks reason: ${record.id}`);
  if (["district", "constituency"].includes(record.geographicScope)) assert(record.state && record.district, `incomplete district hierarchy: ${record.id}`);
  if (record.geographicScope === "state") assert(record.state, `missing state hierarchy: ${record.id}`);
  if (record.geographicScope === "constituency") assert(record.constituency, `missing constituency hierarchy: ${record.id}`);
  if (record.synthetic) assert(record.publicationStatus === "unpublished", `synthetic record cannot be published: ${record.id}`);
}

export function validateAdminGovernance(data: AdminGovernanceData) {
  const sourceIds = new Set<string>();
  for (const source of data.sources) { assert(idPattern.test(source.id) && !sourceIds.has(source.id), `invalid or duplicate source ${source.id}`); assert(sourceTypes.has(source.sourceType) && isUrl(source.url), `invalid source ${source.id}`); sourceIds.add(source.id); }
  const recordIds = new Set<string>();
  const scopedSlugs = new Set<string>();
  for (const record of data.records) { const scopedSlug = `${record.state ?? ""}/${record.district ?? ""}/${record.constituency ?? ""}/${record.slug}`; assert(!recordIds.has(record.id), `duplicate record ${record.id}`); assert(!scopedSlugs.has(scopedSlug), `duplicate scoped slug ${record.slug}`); validateAdminRecord(record, sourceIds); recordIds.add(record.id); scopedSlugs.add(scopedSlug); }
  for (const job of data.imports) { assert(idPattern.test(job.id) && sourceIds.has(job.sourceId), `invalid import ${job.id}`); assert(importStates.has(job.status), `invalid import status ${job.id}`); assert([job.startedAt, job.completedAt].every(isDate), `invalid import date ${job.id}`); assert([job.recordsReceived, job.recordsAccepted, job.recordsRejected].every((count) => Number.isInteger(count) && count >= 0), `invalid import counts ${job.id}`); }
  for (const entry of data.auditLog) { assert(idPattern.test(entry.id) && recordIds.has(entry.recordId), `invalid audit entry ${entry.id}`); assert(auditActions.has(entry.action), `invalid audit action ${entry.id}`); assert((entry.previousStatus === null || reviews.has(entry.previousStatus)) && (entry.newStatus === null || reviews.has(entry.newStatus)), `invalid audit status ${entry.id}`); assert(entry.actor === "system" && isDate(entry.timestamp), `invalid audit metadata ${entry.id}`); }
  return data;
}
