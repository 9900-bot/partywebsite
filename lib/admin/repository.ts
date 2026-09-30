import governanceJson from "@/data/admin-governance.json";
import { validateAdminGovernance } from "@/lib/validation/admin";
import type { AdminGovernanceData } from "@/types/admin";

const governance = validateAdminGovernance(governanceJson as AdminGovernanceData);
export async function getAdminGovernance() { return structuredClone(governance); }
export async function getAdminRecord(id: string) { return structuredClone(governance.records.find((record) => record.id === id)); }
export async function getRecordAudit(id: string) { return structuredClone(governance.auditLog.filter((entry) => entry.recordId === id)); }
