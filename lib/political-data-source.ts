import { constituencies } from "@/data/constituencies";
import { districts } from "@/data/districts";
import { electionResults } from "@/data/elections";
import { politicalStates } from "@/data/political-states";
import { representatives } from "@/data/representatives";
import type { PoliticalDataSource } from "@/types/political";

export class LocalPoliticalDataSource implements PoliticalDataSource {
  async getStates() { return politicalStates; }
  async getDistricts(stateId: string) { return districts.filter((item) => item.stateId === stateId); }
  async getConstituencies(districtId: string) { return constituencies.filter((item) => item.districtId === districtId); }
  async getMLA(constituencyId: string) { return representatives.find((item) => item.constituencyId === constituencyId) ?? null; }
  async getElectionHistory(constituencyId: string) { return electionResults.filter((item) => item.constituencyId === constituencyId).sort((a, b) => a.year - b.year); }
}

export const politicalDataSource: PoliticalDataSource = new LocalPoliticalDataSource();
