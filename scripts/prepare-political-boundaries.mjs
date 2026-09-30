import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline";

const args = Object.fromEntries(
  process.argv.slice(2).map((argument, index, all) => {
    const [key, inlineValue] = argument.split("=", 2);
    return [key.replace(/^--/, ""), inlineValue ?? all[index + 1]];
  }),
);

const districtInput = args.districts && resolve(args.districts);
const assemblyInput = args.assemblies && resolve(args.assemblies);
const outputDirectory = resolve(args.output ?? "public/boundaries");

if (!districtInput || !assemblyInput) {
  console.error("Usage: node scripts/prepare-political-boundaries.mjs --districts <file> --assemblies <file> [--output public/boundaries]");
  process.exit(1);
}

const stateConfig = new Map([
  [29, { id: "ka", slug: "karnataka", name: "Karnataka" }],
  [36, { id: "tg", slug: "telangana", name: "Telangana" }],
]);

const districtAliases = new Map([
  ["ka|bengaluru urban", "ka-bengaluru"],
  ["ka|bangalore urban", "ka-bengaluru"],
  ["ka|mysuru", "ka-mysuru"],
  ["ka|mysore", "ka-mysuru"],
  ["ka|belagavi", "ka-belagavi"],
  ["ka|belgaum", "ka-belagavi"],
  ["ka|dakshina kannada", "ka-dakshina-kannada"],
  ["tg|hyderabad", "tg-hyderabad"],
  ["tg|rangareddy", "tg-rangareddy"],
  ["tg|ranga reddy", "tg-rangareddy"],
  ["tg|warangal", "tg-warangal"],
  ["tg|karimnagar", "tg-karimnagar"],
]);

const constituencyAliases = new Map([
  ["ka|162", "ka-shivajinagar"], ["ka|173", "ka-jayanagar"], ["ka|174", "ka-mahadevapura"],
  ["ka|215", "ka-chamundeshwari"], ["ka|216", "ka-krishnaraja"], ["ka|218", "ka-narasimharaja"],
  ["ka|11", "ka-belagavi-north"], ["ka|12", "ka-belagavi-south"], ["ka|9", "ka-gokak"],
  ["ka|203", "ka-mangaluru-south"], ["ka|205", "ka-bantval"], ["ka|201", "ka-moodabidri"],
  ["tg|61", "tg-jubilee-hills"], ["tg|63", "tg-nampally"], ["tg|58", "tg-malakpet"],
  ["tg|52", "tg-serilingampally"], ["tg|51", "tg-rajendranagar"], ["tg|50", "tg-maheshwaram"],
  ["tg|105", "tg-warangal-west"], ["tg|106", "tg-warangal-east"], ["tg|104", "tg-parkal"],
  ["tg|26", "tg-karimnagar"], ["tg|31", "tg-huzurabad"], ["tg|30", "tg-manakondur"],
]);

function titleCase(value) {
  return String(value ?? "")
    .toLocaleLowerCase("en-IN")
    .replace(/(^|[\s(/-])([a-z])/g, (_, lead, letter) => `${lead}${letter.toLocaleUpperCase("en-IN")}`)
    .replace(/\bSc\b/g, "SC")
    .replace(/\bSt\b/g, "ST")
    .replace(/\s*\((SC|ST)\)/g, " ($1)");
}

function normalized(value) {
  return titleCase(value).toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value) {
  return normalized(value).replace(/\s+/g, "-");
}

function visitCoordinates(coordinates, bounds = [[Infinity, Infinity], [-Infinity, -Infinity]]) {
  if (typeof coordinates?.[0] === "number") {
    const [longitude, latitude] = coordinates;
    bounds[0][0] = Math.min(bounds[0][0], longitude);
    bounds[0][1] = Math.min(bounds[0][1], latitude);
    bounds[1][0] = Math.max(bounds[1][0], longitude);
    bounds[1][1] = Math.max(bounds[1][1], latitude);
    return bounds;
  }
  for (const coordinate of coordinates ?? []) visitCoordinates(coordinate, bounds);
  return bounds;
}

function mergeBounds(target, source) {
  target[0][0] = Math.min(target[0][0], source[0][0]);
  target[0][1] = Math.min(target[0][1], source[0][1]);
  target[1][0] = Math.max(target[1][0], source[1][0]);
  target[1][1] = Math.max(target[1][1], source[1][1]);
}

function outerRings(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates[0]];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates.map((polygon) => polygon[0]);
  return [];
}

function ringArea(ring) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return area / 2;
}

function ringCentroid(ring) {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const cross = ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
    twiceArea += cross;
    x += (ring[index][0] + ring[index + 1][0]) * cross;
    y += (ring[index][1] + ring[index + 1][1]) * cross;
  }
  return Math.abs(twiceArea) > Number.EPSILON ? [x / (3 * twiceArea), y / (3 * twiceArea)] : ring[0];
}

function pointInRing(point, ring) {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current, current += 1) {
    const [x, y] = ring[current];
    const [previousX, previousY] = ring[previous];
    if ((y > point[1]) !== (previousY > point[1]) && point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x) inside = !inside;
  }
  return inside;
}

function geometryContains(geometry, point) {
  const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
  return polygons.some((polygon) => pointInRing(point, polygon[0]) && !polygon.slice(1).some((hole) => pointInRing(point, hole)));
}

function representativePoint(geometry) {
  const ring = outerRings(geometry).sort((left, right) => Math.abs(ringArea(right)) - Math.abs(ringArea(left)))[0];
  if (!ring) return null;
  const centroid = ringCentroid(ring);
  if (geometryContains(geometry, centroid)) return centroid;
  const bounds = visitCoordinates(geometry.coordinates);
  const center = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
  if (geometryContains(geometry, center)) return center;
  return ring[Math.floor(ring.length / 3)] ?? ring[0];
}

async function readGeoJsonLines(path, onFeature) {
  const input = createReadStream(path, { encoding: "utf8" });
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    if (line.trim()) onFeature(JSON.parse(line));
  }
}

const districtFeatures = new Map([...stateConfig.values()].map((state) => [state.id, []]));
const constituencyFeatures = new Map([...stateConfig.values()].map((state) => [state.id, []]));
const districtIndex = new Map();

await readGeoJsonLines(districtInput, (feature) => {
  const properties = feature.properties ?? {};
  const state = stateConfig.get(Number(properties.state_lgd));
  if (!state) return;
  const name = titleCase(properties.dtname);
  const lgdCode = Number(properties.dist_lgd);
  const id = districtAliases.get(`${state.id}|${normalized(name)}`) ?? `${state.id}-district-${lgdCode}`;
  const bounds = visitCoordinates(feature.geometry?.coordinates);
  const normalizedFeature = {
    type: "Feature",
    id,
    bbox: bounds.flat(),
    properties: { id, kind: "district", stateId: state.id, stateLgd: Number(properties.state_lgd), lgdCode, name },
    geometry: feature.geometry,
  };
  districtFeatures.get(state.id).push(normalizedFeature);
  districtIndex.set(`${state.id}|${lgdCode}`, { id, stateId: state.id, name, slug: slug(name), lgdCode, constituencyCount: 0, bounds });
});

await readGeoJsonLines(assemblyInput, (feature) => {
  const properties = feature.properties ?? {};
  // The release carries Bhadrachalam as Andhra Pradesh even though AC 119 is
  // part of Telangana. Normalize that known source anomaly, and drop the
  // empty Karnataka AC 0 placeholder so the constitutional totals stay exact.
  const isBhadrachalam = Number(properties.State_LGD) === 28 && Number(properties.ac_no) === 119 && normalized(properties.ac_name) === "bhadrachalam st";
  if (Number(properties.State_LGD) === 29 && Number(properties.ac_no) === 0 && !String(properties.ac_name ?? "").trim()) return;
  const effectiveStateLgd = isBhadrachalam ? 36 : Number(properties.State_LGD);
  const state = stateConfig.get(effectiveStateLgd);
  if (!state) return;
  const number = Number(properties.ac_no);
  const id = constituencyAliases.get(`${state.id}|${number}`) ?? `${state.id}-ac-${String(number).padStart(3, "0")}`;
  const point = representativePoint(feature.geometry);
  const spatialDistrictFeature = point ? districtFeatures.get(state.id).find((districtFeature) => geometryContains(districtFeature.geometry, point)) : null;
  const districtLgd = isBhadrachalam ? 690 : Number(spatialDistrictFeature?.properties.lgdCode ?? properties.Dist_LGD);
  const district = districtIndex.get(`${state.id}|${districtLgd}`);
  const districtId = district?.id ?? `${state.id}-district-${districtLgd}`;
  const name = titleCase(properties.ac_name);
  const bounds = visitCoordinates(feature.geometry?.coordinates);
  constituencyFeatures.get(state.id).push({
    type: "Feature",
    id,
    bbox: bounds.flat(),
    properties: {
      id,
      kind: "constituency",
      stateId: state.id,
      stateLgd: effectiveStateLgd,
      districtId,
      districtLgd,
      districtName: district?.name ?? (isBhadrachalam ? "Bhadradri Kothagudem" : titleCase(properties.dist_name)),
      number,
      name,
      status: properties.status || null,
    },
    geometry: feature.geometry,
  });
  if (district) district.constituencyCount += 1;
});

await mkdir(outputDirectory, { recursive: true });

const catalog = {
  generatedAt: new Date().toISOString(),
  source: {
    districtRelease: "LGD_Districts.geojsonl.7z (2023-12-11)",
    constituencyRelease: "LGD_Assembly_Constituencies.geojsonl.7z (2023-12-12)",
    districtService: "https://mapservice.gov.in/gismapservice/rest/services/BharatMapService/Admin_Boundary_Village/MapServer/1",
    constituencyService: "https://mapservice.gov.in/gismapservice/rest/services/BharatMapService/AC_PC/MapServer/2",
    license: "CC0-1.0 with source attribution requested",
  },
  states: [],
  districts: [],
  constituencies: [],
};

for (const state of stateConfig.values()) {
  const districts = districtFeatures.get(state.id).sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  const constituencies = constituencyFeatures.get(state.id).sort((a, b) => a.properties.number - b.properties.number);
  const stateBounds = [[Infinity, Infinity], [-Infinity, -Infinity]];
  for (const feature of districts) mergeBounds(stateBounds, visitCoordinates(feature.geometry.coordinates));
  catalog.states.push({ id: state.id, name: state.name, slug: state.slug, bounds: stateBounds, districtCount: districts.length, constituencyCount: constituencies.length });
  catalog.districts.push(...districts.map((feature) => districtIndex.get(`${state.id}|${feature.properties.lgdCode}`)));
  catalog.constituencies.push(...constituencies.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    stateId: state.id,
    districtId: feature.properties.districtId,
    constituencyNumber: feature.properties.number,
    bounds: visitCoordinates(feature.geometry.coordinates),
  })));
  await writeFile(join(outputDirectory, `${state.slug}-districts.geojson`), JSON.stringify({ type: "FeatureCollection", bbox: stateBounds.flat(), features: districts }));
  await writeFile(join(outputDirectory, `${state.slug}-constituencies.geojson`), JSON.stringify({ type: "FeatureCollection", bbox: stateBounds.flat(), features: constituencies }));
}

await writeFile(join(outputDirectory, "catalog.json"), JSON.stringify(catalog, null, 2));

console.log(`Prepared ${catalog.districts.length} districts and ${catalog.constituencies.length} constituencies in ${outputDirectory}`);
for (const state of catalog.states) console.log(`${state.name}: ${state.districtCount} districts, ${state.constituencyCount} constituencies`);
console.log(`Inputs: ${basename(districtInput)}, ${basename(assemblyInput)}`);
