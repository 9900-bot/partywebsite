export type CommunicationVerificationStatus = "verified" | "pending_verification" | "unavailable";
export type CommunicationScope = "national" | "state" | "district" | "constituency";
export type CommunicationReviewStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived";
export type CommunicationPublicationStatus = "unpublished" | "published";

export interface CivicCommunication {
  id: string;
  title: string;
  summary: string;
  category: string;
  scope: CommunicationScope;
  state: string | null;
  district: string | null;
  constituency: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  verificationStatus: CommunicationVerificationStatus;
  sourceName: string | null;
  sourceUrl: string | null;
  sourcePublishedAt: string | null;
  lastVerifiedAt: string | null;
  reviewStatus: CommunicationReviewStatus;
  publicationStatus: CommunicationPublicationStatus;
}
