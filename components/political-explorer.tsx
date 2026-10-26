"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { parties as fallbackParties } from "@/data/parties";
import { politicalDataSource } from "@/lib/political-data-source";
import type { Bounds, Constituency, District, MLA, Party, StateRegion } from "@/types/political";

type Catalog = { states: StateRegion[]; districts: District[]; constituencies: Constituency[]; representatives: MLA[]; parties: Party[] };
type BoundaryCollections = Record<string, { districts: FeatureCollection; constituencies: FeatureCollection }>;
type BoundaryCatalogFile = {
  states: Array<{ id: string; bounds: Bounds; districtCount: number; constituencyCount: number }>;
  districts: District[];
  constituencies: Constituency[];
};
type KarnatakaAssemblyFile = {
  source: { mainUrl: string; mainPageRevisionId: number; mainPageModifiedAt: string; transcludedMembersTableUrl: string; scope: string; attribution: string };
  assembly: { name: string; term: string; termPeriod: string; totalSeats: number; electionDate: string; votingSystem: string };
  validation: { extractedConstituencyCount: number; passedSeatNumberValidation: boolean; ambiguousEntries: Array<{ acNumber?: number; constituency?: string; issue: string }> };
  workbookUrl: string;
  generatedFromWorkbook: boolean;
  parties: Array<{ id: string; abbreviation: string; name: string; seats: number; color: string; colorSource: string }>;
  constituencies: Array<{ acNumber: number; constituency: string; reservation: string; district: string; currentMember: string | null; partyId: string; partyName: string; partyColor: string; remarks: string | null; constituencySourceUrl: string; tableSourceUrl: string; historicalEntries: string }>;
};
type SearchResult = { id: string; title: string; subtitle: string; kind: "state" | "district" | "constituency" | "mla"; constituencyId?: string };
type MapTarget = { kind: "state" | "district" | "constituency"; id: string };

const INDIA_BOUNDS: Bounds = [[67.2, 6.2], [97.6, 37.6]];
const emptyCollection: FeatureCollection = { type: "FeatureCollection", features: [] };

function withPoliticalOverlay(collection: FeatureCollection, representatives: MLA[], partiesById: Record<string, Party>): FeatureCollection {
  const representativeBySeat = new Map(representatives.map((record) => [record.constituencyId, record]));
  return {
    ...collection,
    features: collection.features.map((feature) => {
      const id = String(feature.properties?.id ?? feature.id ?? "");
      const representative = representativeBySeat.get(id);
      return {
        ...feature,
        properties: { ...feature.properties, partyColor: representative ? partiesById[representative.partyId]?.color : "#7d8f9e" },
      } as Feature<Geometry>;
    }),
  };
}

function fitMap(map: maplibregl.Map, bounds: Bounds, padding = 72) {
  map.fitBounds(bounds, { padding, duration: 900, essential: true, maxZoom: 11 });
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("");
}

function Icon({ name }: { name: "search" | "home" | "back" | "people" | "vote" | "map" | "close" }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    home: <><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/></>,
    vote: <><path d="m7 10 3 3 7-7"/><path d="M5 4h14v16H5z"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function PoliticalExplorer() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const catalogRef = useRef<Catalog>({ states: [], districts: [], constituencies: [], representatives: [], parties: fallbackParties });
  const partyLookupRef = useRef<Record<string, Party>>(Object.fromEntries(fallbackParties.map((party) => [party.id, party])));
  const navigateRef = useRef<(target: MapTarget) => void>(() => undefined);
  const hoverRef = useRef<{ source: string; id: string | number } | null>(null);

  const [catalog, setCatalog] = useState<Catalog>({ states: [], districts: [], constituencies: [], representatives: [], parties: fallbackParties });
  const [boundaries, setBoundaries] = useState<BoundaryCollections>({});
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<{ title: string; subtitle: string }>({ title: "India", subtitle: "Choose a state to explore" });
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);
  const [assemblyData, setAssemblyData] = useState<KarnatakaAssemblyFile | null>(null);
  const [assemblyDirectoryOpen, setAssemblyDirectoryOpen] = useState(false);

  const selectedState = catalog.states.find((item) => item.id === selectedStateId) ?? null;
  const selectedDistrict = catalog.districts.find((item) => item.id === selectedDistrictId) ?? null;
  const selectedConstituency = catalog.constituencies.find((item) => item.id === selectedConstituencyId) ?? null;
  const selectedRepresentative = catalog.representatives.find((item) => item.constituencyId === selectedConstituencyId) ?? null;
  const partiesById = useMemo<Record<string, Party>>(() => Object.fromEntries(catalog.parties.map((party) => [party.id, party])), [catalog.parties]);
  const stateDistricts = useMemo(() => catalog.districts.filter((item) => item.stateId === selectedStateId), [catalog.districts, selectedStateId]);
  const districtConstituencies = useMemo(() => catalog.constituencies.filter((item) => item.districtId === selectedDistrictId), [catalog.constituencies, selectedDistrictId]);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      const [politicalStates, boundaryCatalog, karnatakaAssembly, karnatakaDistricts, karnatakaConstituencies, telanganaDistricts, telanganaConstituencies] = await Promise.all([
        politicalDataSource.getStates(),
        fetch("/boundaries/catalog.json").then((response) => response.json()) as Promise<BoundaryCatalogFile>,
        fetch("/data/karnataka-assembly.json").then((response) => response.json()) as Promise<KarnatakaAssemblyFile>,
        fetch("/boundaries/karnataka-districts.geojson").then((response) => response.json()) as Promise<FeatureCollection>,
        fetch("/boundaries/karnataka-constituencies.geojson").then((response) => response.json()) as Promise<FeatureCollection>,
        fetch("/boundaries/telangana-districts.geojson").then((response) => response.json()) as Promise<FeatureCollection>,
        fetch("/boundaries/telangana-constituencies.geojson").then((response) => response.json()) as Promise<FeatureCollection>,
      ]);
      const geographyByState = new Map(boundaryCatalog.states.map((state) => [state.id, state]));
      const statePartySeats = Object.fromEntries(karnatakaAssembly.parties.map((party) => [party.id, party.seats]));
      const states = politicalStates.map((state) => {
        const geography = geographyByState.get(state.id);
        const partySeats = state.id === "ka" ? statePartySeats : {};
        return geography ? { ...state, partySeats, bounds: geography.bounds, districtCount: geography.districtCount, constituencyCount: geography.constituencyCount } : { ...state, partySeats };
      });
      const districts = boundaryCatalog.districts;
      const wikipediaSeatByNumber = new Map(karnatakaAssembly.constituencies.map((item) => [item.acNumber, item]));
      const constituencies = boundaryCatalog.constituencies.map((item) => {
        const wikipediaSeat = item.stateId === "ka" ? wikipediaSeatByNumber.get(item.constituencyNumber) : undefined;
        return wikipediaSeat ? { ...item, name: wikipediaSeat.constituency, reservation: wikipediaSeat.reservation } : item;
      });
      const representatives = constituencies.flatMap((constituency) => {
        if (constituency.stateId !== "ka") return [];
        const wikipediaSeat = wikipediaSeatByNumber.get(constituency.constituencyNumber);
        if (!wikipediaSeat?.currentMember || wikipediaSeat.partyId === "VAC") return [];
        return [{
          id: `wiki-ka-${constituency.constituencyNumber}`,
          name: wikipediaSeat.currentMember,
          constituencyId: constituency.id,
          partyId: wikipediaSeat.partyId,
          remarks: wikipediaSeat.remarks,
          sourceUrl: wikipediaSeat.constituencySourceUrl,
        } satisfies MLA];
      });
      const parties: Party[] = karnatakaAssembly.parties.map((party) => ({ ...party }));
      if (active) {
        const next = { states, districts, constituencies, representatives, parties };
        const nextBoundaries = {
          ka: { districts: karnatakaDistricts, constituencies: karnatakaConstituencies },
          tg: { districts: telanganaDistricts, constituencies: telanganaConstituencies },
        };
        catalogRef.current = next;
        partyLookupRef.current = Object.fromEntries(parties.map((party) => [party.id, party]));
        setCatalog(next);
        setAssemblyData(karnatakaAssembly);
        setBoundaries(nextBoundaries);
        setIsLoading(false);
      }
    }
    loadCatalog();
    return () => { active = false; };
  }, []);

  const navigateToState = (state: StateRegion) => {
    setAssemblyDirectoryOpen(false);
    setSelectedStateId(state.id);
    setSelectedDistrictId(null);
    setSelectedConstituencyId(null);
    setHoverLabel({ title: state.name, subtitle: `${state.constituencyCount} Assembly constituencies` });
  };

  const navigateToDistrict = (district: District) => {
    setAssemblyDirectoryOpen(false);
    setSelectedStateId(district.stateId);
    setSelectedDistrictId(district.id);
    setSelectedConstituencyId(null);
    setHoverLabel({ title: district.name, subtitle: `${district.constituencyCount} constituencies` });
  };

  const navigateToConstituency = (constituency: Constituency) => {
    setAssemblyDirectoryOpen(false);
    setSelectedStateId(constituency.stateId);
    setSelectedDistrictId(constituency.districtId);
    setSelectedConstituencyId(constituency.id);
    const rep = catalogRef.current.representatives.find((item) => item.constituencyId === constituency.id);
    setHoverLabel({ title: constituency.name, subtitle: rep ? `${rep.name} · ${partyLookupRef.current[rep.partyId]?.abbreviation}` : "Boundary and seat record" });
  };

  navigateRef.current = (target) => {
    if (target.kind === "state") {
      const state = catalogRef.current.states.find((item) => item.id === target.id);
      if (state) navigateToState(state);
    } else if (target.kind === "district") {
      const district = catalogRef.current.districts.find((item) => item.id === target.id);
      if (district) navigateToDistrict(district);
    } else {
      const constituency = catalogRef.current.constituencies.find((item) => item.id === target.id);
      if (constituency) navigateToConstituency(constituency);
    }
  };

  useEffect(() => {
    if (!mapNode.current) return;
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: mapNode.current,
      style: { version: 8, sources: {}, layers: [{ id: "ocean", type: "background", paint: { "background-color": "#e9f0f3" } }] },
      bounds: INDIA_BOUNDS,
      fitBoundsOptions: { padding: 56 },
      maxBounds: [[60, 0], [105, 43]],
      minZoom: 2.6,
      maxZoom: 13,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Boundaries: LGD / BharatMaps · Political data: Wikipedia / Excel" }), "bottom-right");

    map.on("load", async () => {
      const response = await fetch("/india-states.geojson");
      const indiaStates = await response.json() as FeatureCollection;
      map.addSource("india", { type: "geojson", data: indiaStates, generateId: false });
      map.addLayer({ id: "state-fill", type: "fill", source: "india", paint: { "fill-color": ["case", ["boolean", ["feature-state", "hover"], false], "#7eb6ad", "#f8fafb"], "fill-opacity": .98 } });
      map.addLayer({ id: "state-line", type: "line", source: "india", paint: { "line-color": "#8194a3", "line-width": ["interpolate", ["linear"], ["zoom"], 3, .7, 8, 1.5] } });
      map.addSource("districts", { type: "geojson", data: emptyCollection, generateId: false });
      map.addLayer({ id: "district-fill", type: "fill", source: "districts", paint: { "fill-color": ["case", ["boolean", ["feature-state", "hover"], false], "#7eb6ad", "#d6ebe7"], "fill-opacity": .82 }, layout: { visibility: "none" } });
      map.addLayer({ id: "district-line", type: "line", source: "districts", paint: { "line-color": "#335b67", "line-width": 1.6 }, layout: { visibility: "none" } });
      map.addSource("constituencies", { type: "geojson", data: emptyCollection, generateId: false });
      map.addLayer({ id: "constituency-fill", type: "fill", source: "constituencies", paint: { "fill-color": ["get", "partyColor"], "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], .9, .68] }, layout: { visibility: "none" } });
      map.addLayer({ id: "constituency-line", type: "line", source: "constituencies", paint: { "line-color": "#ffffff", "line-width": 2 }, layout: { visibility: "none" } });
      setMapReady(true);
    });

    map.on("mousemove", (event) => {
      const visibleLayers = ["constituency-fill", "district-fill", "state-fill"].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none");
      const feature = map.queryRenderedFeatures(event.point, { layers: visibleLayers })[0];
      if (!feature?.id) {
        if (hoverRef.current) map.setFeatureState(hoverRef.current, { hover: false });
        hoverRef.current = null;
        map.getCanvas().style.cursor = "";
        return;
      }
      const source = feature.source;
      if (hoverRef.current && (hoverRef.current.source !== source || hoverRef.current.id !== feature.id)) map.setFeatureState(hoverRef.current, { hover: false });
      hoverRef.current = { source, id: feature.id };
      map.setFeatureState({ source, id: feature.id }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
      const kind = String(feature.properties?.kind ?? "state");
      const id = String(feature.properties?.id ?? "");
      const name = String(feature.properties?.name ?? "Region");
      if (kind === "constituency") {
        const rep = catalogRef.current.representatives.find((item) => item.constituencyId === id);
        setHoverLabel({ title: name, subtitle: rep ? `${rep.name} · ${partyLookupRef.current[rep.partyId]?.abbreviation}` : "Assembly constituency" });
      } else if (kind === "district") {
        const district = catalogRef.current.districts.find((item) => item.id === id);
        setHoverLabel({ title: name, subtitle: district ? `${district.constituencyCount} constituencies` : "District" });
      } else {
        const state = catalogRef.current.states.find((item) => item.mapName === name);
        setHoverLabel({ title: name, subtitle: state ? `${state.constituencyCount} Assembly constituencies` : "Overview not included in this demo" });
      }
    });

    map.on("click", (event) => {
      const visibleLayers = ["constituency-fill", "district-fill", "state-fill"].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none");
      const feature = map.queryRenderedFeatures(event.point, { layers: visibleLayers })[0];
      if (!feature) return;
      const kind = String(feature.properties?.kind ?? "state");
      if (kind === "district" || kind === "constituency") navigateRef.current({ kind, id: String(feature.properties?.id) });
      else {
        const state = catalogRef.current.states.find((item) => item.mapName === String(feature.properties?.name));
        if (state) navigateRef.current({ kind: "state", id: state.id });
      }
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const districtSource = map.getSource("districts") as maplibregl.GeoJSONSource;
    const constituencySource = map.getSource("constituencies") as maplibregl.GeoJSONSource;
    if (!selectedState) {
      map.setPaintProperty("state-fill", "fill-color", ["case", ["boolean", ["feature-state", "hover"], false], "#7eb6ad", "#f8fafb"]);
      map.setLayoutProperty("district-fill", "visibility", "none");
      map.setLayoutProperty("district-line", "visibility", "none");
      map.setLayoutProperty("constituency-fill", "visibility", "none");
      map.setLayoutProperty("constituency-line", "visibility", "none");
      fitMap(map, INDIA_BOUNDS, 56);
      return;
    }
    map.setPaintProperty("state-fill", "fill-color", ["case", ["boolean", ["feature-state", "hover"], false], "#7eb6ad", ["==", ["get", "name"], selectedState.mapName], "#dcece8", "#f6f8f9"]);
    map.setPaintProperty("state-fill", "fill-opacity", ["case", ["==", ["get", "name"], selectedState.mapName], .95, .22]);
    const stateBoundaries = boundaries[selectedState.id];
    districtSource.setData(stateBoundaries?.districts ?? emptyCollection);
    constituencySource.setData(emptyCollection);
    const districtVisibility = stateDistricts.length ? "visible" : "none";
    map.setLayoutProperty("district-fill", "visibility", districtVisibility);
    map.setLayoutProperty("district-line", "visibility", districtVisibility);
    map.setLayoutProperty("constituency-fill", "visibility", "none");
    map.setLayoutProperty("constituency-line", "visibility", "none");
    fitMap(map, selectedState.bounds, 76);
  }, [mapReady, selectedState, stateDistricts, boundaries]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedDistrict) return;
    const source = map.getSource("constituencies") as maplibregl.GeoJSONSource;
    const stateCollection = boundaries[selectedDistrict.stateId]?.constituencies ?? emptyCollection;
    const districtCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: stateCollection.features.filter((feature) => String(feature.properties?.districtId) === selectedDistrict.id),
    };
    source.setData(withPoliticalOverlay(districtCollection, catalog.representatives, partiesById));
    map.setLayoutProperty("constituency-fill", "visibility", "visible");
    map.setLayoutProperty("constituency-line", "visibility", "visible");
    map.setPaintProperty("district-fill", "fill-opacity", ["case", ["==", ["get", "id"], selectedDistrict.id], .45, .12]);
    fitMap(map, selectedDistrict.bounds, 96);
  }, [mapReady, selectedDistrict, districtConstituencies, catalog.representatives, boundaries, partiesById]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedConstituency) return;
    map.setPaintProperty("constituency-fill", "fill-opacity", ["case", ["==", ["get", "id"], selectedConstituency.id], .94, .34]);
    map.setPaintProperty("constituency-line", "line-width", ["case", ["==", ["get", "id"], selectedConstituency.id], 4, 1.5]);
    fitMap(map, selectedConstituency.bounds, 140);
  }, [mapReady, selectedConstituency]);

  const resetIndia = () => {
    setAssemblyDirectoryOpen(false);
    setSelectedStateId(null); setSelectedDistrictId(null); setSelectedConstituencyId(null);
    setHoverLabel({ title: "India", subtitle: "Choose a state to explore" });
  };

  const goBack = () => {
    if (assemblyDirectoryOpen) { setAssemblyDirectoryOpen(false); return; }
    if (selectedConstituency && selectedDistrict) navigateToDistrict(selectedDistrict);
    else if (selectedDistrict && selectedState) navigateToState(selectedState);
    else resetIndia();
  };

  const searchResults = useMemo<SearchResult[]>(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const results: SearchResult[] = [];
    catalog.states.forEach((state) => { if (state.name.toLowerCase().includes(term)) results.push({ id: state.id, title: state.name, subtitle: state.demoCoverage === "complete" ? "State · Full demo" : "State · Overview", kind: "state" }); });
    catalog.districts.forEach((district) => { if (district.name.toLowerCase().includes(term)) results.push({ id: district.id, title: district.name, subtitle: `District · ${catalog.states.find((state) => state.id === district.stateId)?.name}`, kind: "district" }); });
    catalog.constituencies.forEach((item) => { if (item.name.toLowerCase().includes(term)) results.push({ id: item.id, title: item.name, subtitle: `Constituency · ${catalog.states.find((state) => state.id === item.stateId)?.name}`, kind: "constituency" }); });
    catalog.representatives.forEach((rep) => { if (rep.name.toLowerCase().includes(term)) { const constituency = catalog.constituencies.find((item) => item.id === rep.constituencyId); results.push({ id: rep.id, title: rep.name, subtitle: `MLA · ${constituency?.name}`, kind: "mla", constituencyId: rep.constituencyId }); } });
    return results.slice(0, 7);
  }, [query, catalog]);

  const chooseSearchResult = (result: SearchResult) => {
    const kind = result.kind === "mla" ? "constituency" : result.kind;
    navigateRef.current({ kind, id: result.constituencyId ?? result.id });
    setQuery(""); setSearchOpen(false);
  };

  return (
    <div className="atlas-shell"><div className="atlas-frame">
      <header className="atlas-header">
        <button className="brand" type="button" onClick={resetIndia} aria-label="Return to India overview"><span className="brand-mark"><Icon name="map" /></span><span className="brand-copy"><strong>Civic Atlas</strong><span>Political representation · India</span></span></button>
        <div className="search-wrap">
          <Icon name="search" />
          <input className="search-input" value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} aria-label="Search political regions and representatives" placeholder="Search state, district, constituency or MLA…" />
          {query && <button className="search-clear" type="button" onClick={() => setQuery("")} aria-label="Clear search"><Icon name="close" /></button>}
          {searchOpen && query.length >= 2 && <div className="search-results" role="listbox">{searchResults.length ? searchResults.map((result) => <button key={`${result.kind}-${result.id}`} type="button" onClick={() => chooseSearchResult(result)}><span><strong>{result.title}</strong><small>{result.subtitle}</small></span><em>{result.kind === "mla" ? "MLA" : result.kind[0].toUpperCase()}</em></button>) : <div className="search-empty">No mapped region matches “{query}”.</div>}</div>}
        </div>
        <span className="demo-pill">Excel-linked data</span>
      </header>

      <main className="workspace">
        <section className="map-column" aria-label="Interactive political map">
          <div ref={mapNode} className="map-canvas" />
          {!mapReady && <div className="map-loader"><span /><strong>Drawing the map</strong></div>}
          <div className="map-overlay-top">
            <div className="map-nav">{selectedState && <button type="button" className="back-button" onClick={goBack} aria-label="Go back one level"><Icon name="back" /></button>}<nav className="breadcrumbs" aria-label="Current map level"><button type="button" onClick={resetIndia}>India</button>{selectedState && <><b>/</b><button type="button" onClick={() => navigateToState(selectedState)}>{selectedState.name}</button></>}{assemblyDirectoryOpen && <><b>/</b><span>All 224 seats</span></>}{!assemblyDirectoryOpen && selectedDistrict && <><b>/</b><button type="button" onClick={() => navigateToDistrict(selectedDistrict)}>{selectedDistrict.name}</button></>}{!assemblyDirectoryOpen && selectedConstituency && <><b>/</b><span>{selectedConstituency.name}</span></>}</nav></div>
            <button type="button" className="reset-button" onClick={resetIndia}><Icon name="home" /><span>India view</span></button>
          </div>
          <div className="map-status" aria-live="polite"><small>{selectedConstituency ? "Constituency" : selectedDistrict ? "District" : selectedState ? "State" : "Map focus"}</small><strong>{hoverLabel.title}</strong><span>{hoverLabel.subtitle}</span></div>
        </section>

        <aside className={`info-panel ${(selectedConstituency || assemblyDirectoryOpen) ? "detail-panel" : ""}`} aria-live="polite">
          {isLoading ? <PanelSkeleton /> : assemblyDirectoryOpen && assemblyData ? <AssemblyDirectoryPanel data={assemblyData} constituencies={catalog.constituencies} onClose={() => setAssemblyDirectoryOpen(false)} onSelect={navigateToConstituency} /> : selectedConstituency && selectedState && selectedDistrict ? <ConstituencyPanel constituency={selectedConstituency} district={selectedDistrict} state={selectedState} representative={selectedRepresentative} partiesById={partiesById} assemblySeat={assemblyData?.constituencies.find((seat) => seat.acNumber === selectedConstituency.constituencyNumber) ?? null} /> : selectedDistrict && selectedState ? <DistrictPanel district={selectedDistrict} state={selectedState} constituencies={districtConstituencies} representatives={catalog.representatives} partiesById={partiesById} onSelect={navigateToConstituency} /> : selectedState ? <StatePanel state={selectedState} districts={stateDistricts} partiesById={partiesById} onSelect={navigateToDistrict} hoveredParty={hoveredParty} setHoveredParty={setHoveredParty} onOpenDirectory={selectedState.id === "ka" && assemblyData ? () => setAssemblyDirectoryOpen(true) : undefined} /> : <OverviewPanel states={catalog.states} onSelect={navigateToState} />}
        </aside>
      </main>
    </div></div>
  );
}

function OverviewPanel({ states, onSelect }: { states: StateRegion[]; onSelect: (state: StateRegion) => void }) {
  return <><div className="panel-scroll"><div className="kicker">National overview</div><h1 className="panel-title">India</h1><p className="panel-copy">Follow the map from a state to its real district and Assembly constituency boundaries.</p><div className="metric-grid"><div className="metric"><strong>64</strong><span>Mapped districts</span></div><div className="metric"><strong>343</strong><span>Mapped constituencies</span></div></div><div className="section-rule" /><h2 className="mini-heading">Begin with a state</h2><div className="state-list">{states.map((state) => <button className="state-button" type="button" key={state.id} onClick={() => onSelect(state)}><span><strong>{state.name}</strong><small>{state.demoCoverage === "complete" ? `${state.districtCount} verified districts` : "Overview only"}</small></span><em>{state.constituencyCount}</em></button>)}</div></div><DemoNote /> </>;
}

function StatePanel({ state, districts, partiesById, onSelect, hoveredParty, setHoveredParty, onOpenDirectory }: { state: StateRegion; districts: District[]; partiesById: Record<string, Party>; onSelect: (district: District) => void; hoveredParty: string | null; setHoveredParty: (id: string | null) => void; onOpenDirectory?: () => void }) {
  const composition = Object.entries(state.partySeats).sort((a, b) => b[1] - a[1]);
  return <><div className="panel-scroll"><div className="kicker">State overview</div><h1 className="panel-title">{state.name}</h1><div className="metric-grid three"><div className="metric"><strong>{state.constituencyCount}</strong><span>Constituencies</span></div><div className="metric"><strong>{state.districtCount}</strong><span>Districts</span></div><div className="metric"><strong>{composition.length || "—"}</strong><span>Parties shown</span></div></div>{onOpenDirectory && <button className="assembly-directory-cta" type="button" onClick={onOpenDirectory}><span><small>Complete Excel-backed directory</small><strong>Browse all 224 Assembly seats</strong></span><b>Open →</b></button>}{state.demoCoverage === "overview" ? <div className="empty-card"><Icon name="map" /><h2>Overview only</h2><p>Complete district and Assembly maps are available for Karnataka and Telangana.</p></div> : <>{composition.length ? <section className="panel-section"><div className="section-heading"><div><span>Wikipedia data</span><h2>Assembly composition</h2></div><small>{state.constituencyCount} seats</small></div><div className="assembly-dots" aria-label={`Current assembly composition for ${state.name}`}>{composition.flatMap(([partyId, count]) => Array.from({ length: count }, (_, index) => <span key={`${partyId}-${index}`} style={{ backgroundColor: partiesById[partyId]?.color }} className={hoveredParty && hoveredParty !== partyId ? "muted-dot" : ""} title={`${partiesById[partyId]?.abbreviation ?? partyId} seat`} />))}</div><div className="party-list">{composition.map(([partyId, count]) => { const party = partiesById[partyId]; if (!party) return null; return <button key={partyId} type="button" onMouseEnter={() => setHoveredParty(partyId)} onMouseLeave={() => setHoveredParty(null)} onFocus={() => setHoveredParty(partyId)} onBlur={() => setHoveredParty(null)}><i style={{ backgroundColor: party.color }} /><span><strong>{party.abbreviation}</strong><small>{party.name}</small></span><em>{count}</em></button>; })}</div></section> : <div className="empty-card"><Icon name="people" /><h2>Political workbook not attached</h2><p>The geographic map is complete. This pass connects verified political records for Karnataka only.</p></div>}<section className="panel-section"><div className="section-heading"><div><span>LGD geography</span><h2>Choose a district</h2></div><small>{districts.length} mapped</small></div><div className="district-list">{districts.map((district) => <button type="button" key={district.id} onClick={() => onSelect(district)}><span><strong>{district.name}</strong><small>{district.constituencyCount} constituencies</small></span><b>View</b></button>)}</div></section></>}</div><DemoNote /></>;
}

function DistrictPanel({ district, state, constituencies, representatives, partiesById, onSelect }: { district: District; state: StateRegion; constituencies: Constituency[]; representatives: MLA[]; partiesById: Record<string, Party>; onSelect: (item: Constituency) => void }) {
  return <><div className="panel-scroll"><div className="kicker">District · {state.name}</div><h1 className="panel-title">{district.name}</h1><p className="panel-copy">Select an Assembly constituency to inspect its exact mapped boundary and current member record.</p><div className="section-rule" /><div className="section-heading"><div><span>Assembly areas</span><h2>Constituencies</h2></div><small>{constituencies.length} mapped</small></div><div className="constituency-list">{constituencies.map((item) => { const rep = representatives.find((record) => record.constituencyId === item.id); const party = rep ? partiesById[rep.partyId] : null; return <button type="button" key={item.id} onClick={() => onSelect(item)}><span className="constituency-number">AC {item.constituencyNumber}{item.reservation && item.reservation !== "GEN" ? ` · ${item.reservation}` : ""}</span><strong>{item.name}</strong>{rep && party ? <span className="rep-line"><i style={{ backgroundColor: party.color }} />{rep.name}<em>{party.abbreviation}</em></span> : <small>{state.id === "ka" ? "Vacant or source discrepancy" : "Boundary record available"}</small>}</button>; })}</div></div><DemoNote /></>;
}

function AssemblyDirectoryPanel({ data, constituencies, onClose, onSelect }: { data: KarnatakaAssemblyFile; constituencies: Constituency[]; onClose: () => void; onSelect: (item: Constituency) => void }) {
  const [term, setTerm] = useState("");
  const [partyFilter, setPartyFilter] = useState("ALL");
  const visibleSeats = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return data.constituencies.filter((seat) => {
      const matchesParty = partyFilter === "ALL" || seat.partyId === partyFilter;
      const haystack = `${seat.acNumber} ${seat.constituency} ${seat.district} ${seat.currentMember ?? "vacant"} ${seat.partyName} ${seat.reservation} ${seat.remarks ?? ""}`.toLowerCase();
      return matchesParty && (!needle || haystack.includes(needle));
    });
  }, [data.constituencies, partyFilter, term]);
  const memberCount = data.constituencies.filter((seat) => seat.currentMember).length;
  const vacancyCount = data.constituencies.length - memberCount;
  const openSeat = (seat: KarnatakaAssemblyFile["constituencies"][number]) => {
    const mapped = constituencies.find((item) => item.stateId === "ka" && item.constituencyNumber === seat.acNumber);
    if (mapped) onSelect(mapped);
  };
  return <><div className="panel-scroll assembly-directory"><div className="directory-heading"><div><div className="kicker">Complete Karnataka dataset</div><h1 className="panel-title">All Assembly seats</h1></div><button type="button" onClick={onClose} aria-label="Close Assembly directory"><Icon name="close" /></button></div><p className="panel-copy">Every constituency, district, reservation, current member, party, color and source note from the attached workbook.</p><div className="metric-grid three"><div className="metric"><strong>{data.constituencies.length}</strong><span>Total seats</span></div><div className="metric"><strong>{memberCount}</strong><span>Current members</span></div><div className="metric"><strong>{vacancyCount}</strong><span>Vacancies</span></div></div><div className="directory-controls"><label><Icon name="search" /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search seat, district, MLA or party" aria-label="Search all Karnataka Assembly seats" /></label><div className="party-filters" aria-label="Filter by party"><button type="button" className={partyFilter === "ALL" ? "active" : ""} onClick={() => setPartyFilter("ALL")}>All</button>{data.parties.map((party) => <button type="button" key={party.id} className={partyFilter === party.id ? "active" : ""} onClick={() => setPartyFilter(party.id)}><i style={{ backgroundColor: party.color }} />{party.abbreviation}<span>{party.seats}</span></button>)}</div></div><div className="directory-count"><strong>{visibleSeats.length}</strong> records shown <span>·</span> source revised {new Date(data.source.mainPageModifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div><div className="seat-directory-list">{visibleSeats.map((seat) => <button type="button" key={seat.acNumber} onClick={() => openSeat(seat)}><span className="seat-ac">AC {seat.acNumber}</span><span className="seat-main"><strong>{seat.constituency}</strong><small>{seat.district} · {seat.reservation || "GEN"}</small><em>{seat.currentMember ?? "Vacant"}</em></span><span className="seat-party"><i style={{ backgroundColor: seat.partyColor }} />{seat.partyId === "JDS" ? "JD(S)" : seat.partyId}</span></button>)}</div>{!visibleSeats.length && <div className="directory-empty">No seats match this search and party filter.</div>}<section className="directory-provenance"><span>Source & validation</span><p>{data.assembly.term} · {data.assembly.termPeriod} · {data.assembly.votingSystem}. Seat-number validation: {data.validation.passedSeatNumberValidation ? "passed" : "review required"}.</p><a href={data.source.mainUrl} target="_blank" rel="noreferrer">Open Wikipedia source</a><a href={data.workbookUrl} download>Download complete Excel workbook</a></section></div></>;
}

function ConstituencyPanel({ constituency, district, state, representative, partiesById, assemblySeat }: { constituency: Constituency; district: District; state: StateRegion; representative: MLA | null; partiesById: Record<string, Party>; assemblySeat: KarnatakaAssemblyFile["constituencies"][number] | null }) {
  const party = representative ? partiesById[representative.partyId] : null;
  return <><div className="panel-scroll"><div className="kicker">Assembly constituency · AC {constituency.constituencyNumber}</div><h1 className="panel-title constituency-title">{constituency.name}</h1><p className="location-line">{district.name}<span>•</span>{state.name}</p>{representative && party ? <><section className="mla-card"><div className="profile-avatar" style={{ backgroundColor: `${party.color}22`, color: party.color }}>{initials(representative.name)}</div><div><span>Current member</span><h2>{representative.name}</h2><p><i style={{ backgroundColor: party.color }} />{party.name}</p></div></section><div className="stat-strip"><div><Icon name="vote" /><strong>AC {constituency.constituencyNumber}</strong><span>Constituency number</span></div><div><Icon name="people" /><strong>{constituency.reservation ?? "GEN"}</strong><span>Reservation</span></div><div><Icon name="map" /><strong>{party.abbreviation}</strong><span>Current party</span></div><div><Icon name="vote" /><strong>16th</strong><span>Karnataka Assembly</span></div></div>{representative.remarks && <section className="source-record"><span>Wikipedia note</span><p>{representative.remarks}</p></section>}{assemblySeat?.historicalEntries && <section className="source-record history-record"><span>Preserved source history</span><p>{assemblySeat.historicalEntries}</p></section>}{representative.sourceUrl && <a className="source-link" href={representative.sourceUrl} target="_blank" rel="noreferrer">Open constituency source</a>}</> : <><div className="empty-card"><Icon name="map" /><h2>{state.id === "ka" ? "Seat currently vacant" : "Boundary mapped"}</h2><p>{state.id === "ka" ? "The Excel-backed Wikipedia record marks this constituency as vacant or source-conflicted." : "Political records are not attached for this state yet."}</p></div>{assemblySeat?.remarks && <section className="source-record"><span>Wikipedia note</span><p>{assemblySeat.remarks}</p></section>}{assemblySeat?.historicalEntries && <section className="source-record history-record"><span>Preserved source history</span><p>{assemblySeat.historicalEntries}</p></section>}{assemblySeat?.constituencySourceUrl && <a className="source-link" href={assemblySeat.constituencySourceUrl} target="_blank" rel="noreferrer">Open constituency source</a>}</>}</div><DemoNote /></>;
}

function DemoNote() { return <p className="sample-note"><strong>Excel-backed</strong><span>Karnataka members and party colors come from the supplied Wikipedia page. Boundaries use LGD/BharatMaps.</span><a href="/data/karnataka-assembly-data.xlsx" download>Download workbook</a></p>; }

function PanelSkeleton() { return <div className="panel-skeleton" aria-label="Loading political data"><span className="sk-line short"/><span className="sk-line title"/><span className="sk-line"/><div className="sk-grid"><span/><span/></div><span className="sk-line"/><span className="sk-line"/></div>; }
