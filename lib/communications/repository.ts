import records from "@/data/communications.json";
import { validateCommunications } from "@/lib/validation/communication";
import type { CivicCommunication } from "@/types/communication";

const communications = validateCommunications(records as CivicCommunication[]);

export async function getCommunications(): Promise<CivicCommunication[]> {
  return communications.filter((record) => record.reviewStatus === "approved" && record.publicationStatus === "published").sort((a, b) => {
    const first = Date.parse(a.publishedAt ?? a.updatedAt ?? "1970-01-01");
    const second = Date.parse(b.publishedAt ?? b.updatedAt ?? "1970-01-01");
    return second - first;
  });
}

export async function getCommunication(id: string): Promise<CivicCommunication | undefined> {
  return communications.find((record) => record.id === id && record.reviewStatus === "approved" && record.publicationStatus === "published");
}
