import type { CivicCatalog, RepresentativeStatus } from "@/types/civic";

const statuses = new Set<RepresentativeStatus>(["current", "former", "vacant", "unverified"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isUrl(value: string) { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } }
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Invalid civic data: ${message}`); }

export function validateCivicCatalog(catalog: CivicCatalog): CivicCatalog {
  const districtIds = new Set<string>();
  const districtSlugs = new Set<string>();
  for (const district of catalog.districts) {
    assert(district.id && district.stateId && district.name, "district required fields are missing");
    assert(slugPattern.test(district.slug), `invalid district slug: ${district.slug}`);
    assert(!districtIds.has(district.id), `duplicate district id: ${district.id}`);
    const scopedSlug = `${district.stateId}:${district.slug}`;
    assert(!districtSlugs.has(scopedSlug), `duplicate district slug: ${scopedSlug}`);
    assert(isUrl(district.sourceUrl), `invalid district source URL: ${district.id}`);
    districtIds.add(district.id); districtSlugs.add(scopedSlug);
  }

  const constituencyIds = new Set<string>();
  const constituencySlugs = new Set<string>();
  for (const constituency of catalog.constituencies) {
    assert(constituency.id && constituency.stateId && constituency.districtId && constituency.name, "constituency required fields are missing");
    assert(districtIds.has(constituency.districtId), `unknown district: ${constituency.districtId}`);
    assert(Number.isInteger(constituency.number) && constituency.number > 0, `invalid constituency number: ${constituency.id}`);
    assert(slugPattern.test(constituency.slug), `invalid constituency slug: ${constituency.slug}`);
    assert(!constituencyIds.has(constituency.id), `duplicate constituency id: ${constituency.id}`);
    const scopedSlug = `${constituency.districtId}:${constituency.slug}`;
    assert(!constituencySlugs.has(scopedSlug), `duplicate constituency slug: ${scopedSlug}`);
    assert(isUrl(constituency.sourceUrl), `invalid constituency source URL: ${constituency.id}`);
    constituencyIds.add(constituency.id); constituencySlugs.add(scopedSlug);
  }

  const partyIds = new Set(catalog.parties.map((party) => party.id));
  assert(partyIds.size === catalog.parties.length, "duplicate party id");
  for (const party of catalog.parties) assert(party.id && party.name && party.abbreviation && slugPattern.test(party.slug), `invalid party: ${party.id}`);
  for (const representative of catalog.representatives) {
    assert(constituencyIds.has(representative.constituencyId), `unknown representative constituency: ${representative.constituencyId}`);
    assert(representative.partyId === null || partyIds.has(representative.partyId), `unknown representative party: ${representative.partyId}`);
    assert(statuses.has(representative.status), `invalid representative status: ${representative.status}`);
    assert(isUrl(representative.sourceUrl), `invalid representative source URL: ${representative.id}`);
  }
  return catalog;
}
