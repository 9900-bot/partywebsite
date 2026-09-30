import fs from "node:fs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error("Usage: node scripts/prepare-state-geojson.mjs <source.geojsonl> <output.geojson>");

const states = JSON.parse(fs.readFileSync(new URL("../data/states.json", import.meta.url), "utf8"));
const byId = new Map(states.map((state) => [Number(state.id), state]));
const sourceFeatures = fs.readFileSync(inputPath, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
const features = sourceFeatures.flatMap((feature) => {
  const state = byId.get(Number(feature.properties.State_LGD));
  if (!state || String(feature.properties.STATE).startsWith("DISPUTED")) return [];
  return [{ type: "Feature", id: state.id, properties: state, geometry: feature.geometry }];
});

if (features.length !== states.length) throw new Error(`Expected ${states.length} state/UT features, received ${features.length}.`);
fs.writeFileSync(outputPath, JSON.stringify({ type: "FeatureCollection", features }));
