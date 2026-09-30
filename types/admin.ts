import type { CommunicationVerificationStatus } from "@/types/communication";

export type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived";
export type PublicationStatus = "unpublished" | "published";
export type SourceType = "government" | "election_authority" | "official_publication" | "official_website" | "dataset" | "other";
export type ImportStatus = "queued" | "processing" | "completed" | "completed_with_errors" | "failed";
export type AuditAction = "created" | "imported" | "edited" | "submitted_for_review" | "approved" | "rejected" | "archived" | "restored";

export interface SourceRecord { id: string; name: string; organization: string; sourceType: SourceType; url: string; description: string | null; jurisdiction: string | null; reliabilityNotes: string | null; active: boolean; createdAt: string; updatedAt: string; }
export interface ImportJob { id: string; sourceId: string; importType: string; filename: string | null; startedAt: string | null; completedAt: string | null; status: ImportStatus; recordsReceived: number; recordsAccepted: number; recordsRejected: number; errorSummary: string | null; }
export interface AdminRecord { id: string; slug: string; recordType: string; title: string; geographicScope: "none" | "national" | "state" | "district" | "constituency"; state: string | null; district: string | null; constituency: string | null; verificationStatus: CommunicationVerificationStatus; reviewStatus: ReviewStatus; publicationStatus: PublicationStatus; sourceId: string | null; sourceUrl: string | null; createdAt: string; updatedAt: string; lastVerifiedAt: string | null; rejectionReason: string | null; synthetic: boolean; validationResults: string[]; }
export interface AuditLogEntry { id: string; recordId: string; action: AuditAction; previousStatus: ReviewStatus | null; newStatus: ReviewStatus | null; actor: "system"; timestamp: string; reason: string | null; metadata: Record<string, unknown>; }
export interface AdminGovernanceData { sources: SourceRecord[]; imports: ImportJob[]; records: AdminRecord[]; auditLog: AuditLogEntry[]; }
