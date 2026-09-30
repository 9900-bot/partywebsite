export type Bounds = [[number, number], [number, number]];
export type Position = [number, number];

export interface Party {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
}

export interface StateRegion {
  id: string;
  name: string;
  mapName: string;
  slug: string;
  constituencyCount: number;
  districtCount: number;
  bounds: Bounds;
  partySeats: Record<string, number>;
  demoCoverage: "complete" | "overview";
}

export interface District {
  id: string;
  stateId: string;
  name: string;
  slug: string;
  constituencyCount: number;
  bounds: Bounds;
  polygon: Position[][];
}

export interface Constituency {
  id: string;
  name: string;
  stateId: string;
  districtId: string;
  constituencyNumber: number;
  bounds: Bounds;
  polygon: Position[][];
}

export interface MLA {
  id: string;
  name: string;
  constituencyId: string;
  partyId: string;
  currentTermStart: number;
  consecutiveWins: number;
  totalWins: number;
}

export interface ElectionCandidateResult {
  candidateId: string;
  candidateName: string;
  partyId: string;
  votes: number;
  votePercentage: number;
  position: number;
}

export interface ElectionResult {
  constituencyId: string;
  year: number;
  candidates: ElectionCandidateResult[];
  winningMargin: number;
}

export interface PoliticalDataSource {
  getStates(): Promise<StateRegion[]>;
  getDistricts(stateId: string): Promise<District[]>;
  getConstituencies(districtId: string): Promise<Constituency[]>;
  getMLA(constituencyId: string): Promise<MLA | null>;
  getElectionHistory(constituencyId: string): Promise<ElectionResult[]>;
}
