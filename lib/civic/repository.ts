import karnatakaCatalog from "@/data/civic/karnataka.json";
import { getStateBySlug, states } from "@/data/states";
import { validateCivicCatalog } from "@/lib/validation/civic";
import type { AssemblyConstituency, CivicCatalog, District, Representative, State } from "@/types/civic";

const unionTerritoryCodes = new Set(["AN", "CH", "DH", "DL", "JK", "LA", "LD", "PY"]);
const catalog = validateCivicCatalog(karnatakaCatalog as CivicCatalog);

export function getState(slug: string): State | undefined {
  const state = getStateBySlug(slug);
  return state && { id: state.id, name: state.name, slug: state.slug, type: unionTerritoryCodes.has(state.code) ? "union-territory" : "state" };
}
export function getAllStates(): State[] { return states.map((state) => ({ id: state.id, name: state.name, slug: state.slug, type: unionTerritoryCodes.has(state.code) ? "union-territory" : "state" })); }
export function getDistrictsByState(stateId: string): District[] { return catalog.districts.filter((district) => district.stateId === stateId); }
export function getDistrict(stateId: string, slug: string): District | undefined { return catalog.districts.find((district) => district.stateId === stateId && district.slug === slug); }
export function getConstituenciesByDistrict(districtId: string): AssemblyConstituency[] { return catalog.constituencies.filter((item) => item.districtId === districtId).sort((a, b) => a.number - b.number); }
export function getConstituency(districtId: string, slug: string): AssemblyConstituency | undefined { return catalog.constituencies.find((item) => item.districtId === districtId && item.slug === slug); }
export function getRepresentative(constituencyId: string): Representative | undefined { return catalog.representatives.find((item) => item.constituencyId === constituencyId && item.status === "current"); }
