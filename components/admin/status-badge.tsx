import type { ReviewStatus } from "@/types/admin";
import type { CommunicationVerificationStatus } from "@/types/communication";

const labels = { pending_verification: "Pending verification", verified: "Verified", unavailable: "Unavailable", draft: "Draft", pending_review: "Pending review", approved: "Approved", rejected: "Rejected", archived: "Archived" };
export function StatusBadge({ status }: { status: ReviewStatus | CommunicationVerificationStatus }) { const color = status === "verified" || status === "approved" ? "bg-emerald-100 text-emerald-800" : status === "rejected" ? "bg-red-100 text-red-800" : status === "pending_review" || status === "pending_verification" ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-700"; return <span className={`inline-flex px-2.5 py-1 text-xs font-bold ${color}`}>{labels[status]}</span>; }
