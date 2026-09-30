export type StateType = "state" | "union-territory";

export interface State {
  id: string;
  name: string;
  type: StateType;
  slug: string;
}

export interface District {
  id: string;
  stateId: string;
  name: string;
  slug: string;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
}

export interface AssemblyConstituency {
  id: string;
  stateId: string;
  districtId: string;
  name: string;
  number: number;
  slug: string;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
}

export type RepresentativeStatus = "current" | "former" | "vacant" | "unverified";

export interface Representative {
  id: string;
  constituencyId: string;
  name: string;
  partyId: string | null;
  partyName: string | null;
  partyAbbreviation: string | null;
  status: RepresentativeStatus;
  term: string | null;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedAt: string;
}

export interface PoliticalParty {
  id: string;
  name: string;
  abbreviation: string;
  slug: string;
}

export interface CivicCatalog {
  districts: District[];
  constituencies: AssemblyConstituency[];
  representatives: Representative[];
  parties: PoliticalParty[];
}
