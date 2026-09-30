import type { CommunicationVerificationStatus } from "@/types/communication";

const labels: Record<CommunicationVerificationStatus, string> = { verified: "Verified", pending_verification: "Pending verification", unavailable: "Unavailable" };
export function VerificationBadge({ status }: { status: CommunicationVerificationStatus }) {
  const color = status === "verified" ? "bg-emerald-100 text-emerald-800" : status === "pending_verification" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-700";
  return <span className={`inline-flex px-2.5 py-1 text-xs font-bold ${color}`}>{labels[status]}</span>;
}
