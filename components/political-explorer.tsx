"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { partyById } from "@/data/parties";
import { politicalDataSource } from "@/lib/political-data-source";
import type { Bounds, Constituency, District, ElectionResult, MLA, StateRegion } from "@/types/political";

type Catalog = { states: StateRegion[]; districts: District[]; constituencies: Constituency[]; representatives: MLA[] };
type SearchResult = { id: string; title: string; subtitle: string; kind: "state" | "district" | "constituency" | "mla"; constituencyId?: string };
type MapTarget = { kind: "state" | "district" | "constituency"; id: string };

const INDIA_BOUNDS: Bounds = [[67.2, 6.2], [97.6, 37.6]];
const emptyCollection: FeatureCollection = { type: "FeatureCollection", features: [] };

function toFeatureCollection<T extends District | Constituency>(items: T[], kind: "district" | "constituency", representatives: MLA[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: items.map((item) => {
      const rep = kind === "constituency" ? representatives.find((record) => record.constituencyId === item.id) : undefined;
      return {
        type: "Feature",
        id: item.id,
        properties: { id: item.id, name: item.name, kind, partyColor: rep ? partyById[rep.partyId]?.color : "#6f8295" },
        geometry: { type: "Polygon", coordinates: item.polygon },
      };
    }),
  } as FeatureCollection;
}

function fitMap(map: maplibregl.Map, bounds: Bounds, padding = 72) {
  map.fitBounds(bounds, { padding, duration: 900, essential: true, maxZoom: 11 });
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
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
  const catalogRef = useRef<Catalog>({ states: [], districts: [], constituencies: [], representatives: [] });
  const navigateRef = useRef<(target: MapTarget) => void>(() => undefined);
  const hoverRef = useRef<{ source: string; id: string | number } | null>(null);

  const [catalog, setCatalog] = useState<Catalog>({ states: [], districts: [], constituencies: [], representatives: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | null>(null);
  const [history, setHistory] = useState<ElectionResult[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<{ title: string; subtitle: string }>({ title: "India", subtitle: "Choose a state to explore" });
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);

  const selectedState = catalog.states.find((item) => item.id === selectedStateId) ?? null;
  const selectedDistrict = catalog.districts.find((item) => item.id === selectedDistrictId) ?? null;
  const selectedConstituency = catalog.constituencies.find((item) => item.id === selectedConstituencyId) ?? null;
  const selectedRepresentative = catalog.representatives.find((item) => item.constituencyId === selectedConstituencyId) ?? null;
  const stateDistricts = catalog.districts.filter((item) => item.stateId === selectedStateId);
  const districtConstituencies = catalog.constituencies.filter((item) => item.districtId === selectedDistrictId);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      const states = await politicalDataSource.getStates();
      const districtGroups = await Promise.all(states.map((state) => politicalDataSource.getDistricts(state.id)));
      const districts = districtGroups.flat();
      const constituencyGroups = await Promise.all(districts.map((district) => politicalDataSource.getConstituencies(district.id)));
      const constituencies = constituencyGroups.flat();
      const representatives = (await Promise.all(constituencies.map((item) => politicalDataSource.getMLA(item.id)))).filter((item): item is MLA => Boolean(item));
      if (active) {
        const next = { states, districts, constituencies, representatives };
        catalogRef.current = next;
        setCatalog(next);
        setIsLoading(false);
      }
    }
    loadCatalog();
    return () => { active = false; };
  }, []);

  const navigateToState = (state: StateRegion) => {
    setSelectedStateId(state.id);
    setSelectedDistrictId(null);
    setSelectedConstituencyId(null);
    setHistory([]);
    setHoverLabel({ title: state.name, subtitle: `${state.constituencyCount} Assembly constituencies` });
  };

  const navigateToDistrict = (district: District) => {
    setSelectedStateId(district.stateId);
    setSelectedDistrictId(district.id);
    setSelectedConstituencyId(null);
    setHistory([]);
    setHoverLabel({ title: district.name, subtitle: `${district.constituencyCount} constituencies` });
  };

  const navigateToConstituency = (constituency: Constituency) => {
    setSelectedStateId(constituency.stateId);
    setSelectedDistrictId(constituency.districtId);
    setSelectedConstituencyId(constituency.id);
    const rep = catalogRef.current.representatives.find((item) => item.constituencyId === constituency.id);
    setHoverLabel({ title: constituency.name, subtitle: rep ? `${rep.name} · ${partyById[rep.partyId]?.abbreviation}` : "Representative details" });
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
    if (!selectedConstituencyId) return;
    let active = true;
    politicalDataSource.getElectionHistory(selectedConstituencyId).then((records) => { if (active) setHistory(records); });
    return () => { active = false; };
  }, [selectedConstituencyId]);

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
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Demo political data · Boundaries for navigation" }), "bottom-right");

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
        setHoverLabel({ title: name, subtitle: rep ? `${rep.name} · ${partyById[rep.partyId]?.abbreviation}` : "Assembly constituency" });
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
    districtSource.setData(toFeatureCollection(stateDistricts, "district", catalog.representatives));
    constituencySource.setData(emptyCollection);
    const districtVisibility = stateDistricts.length ? "visible" : "none";
    map.setLayoutProperty("district-fill", "visibility", districtVisibility);
    map.setLayoutProperty("district-line", "visibility", districtVisibility);
    map.setLayoutProperty("constituency-fill", "visibility", "none");
    map.setLayoutProperty("constituency-line", "visibility", "none");
    fitMap(map, selectedState.bounds, 76);
  }, [mapReady, selectedState, stateDistricts, catalog.representatives]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedDistrict) return;
    const source = map.getSource("constituencies") as maplibregl.GeoJSONSource;
    source.setData(toFeatureCollection(districtConstituencies, "constituency", catalog.representatives));
    map.setLayoutProperty("constituency-fill", "visibility", "visible");
    map.setLayoutProperty("constituency-line", "visibility", "visible");
    map.setPaintProperty("district-fill", "fill-opacity", ["case", ["==", ["get", "id"], selectedDistrict.id], .45, .12]);
    fitMap(map, selectedDistrict.bounds, 96);
  }, [mapReady, selectedDistrict, districtConstituencies, catalog.representatives]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedConstituency) return;
    map.setPaintProperty("constituency-fill", "fill-opacity", ["case", ["==", ["get", "id"], selectedConstituency.id], .94, .34]);
    map.setPaintProperty("constituency-line", "line-width", ["case", ["==", ["get", "id"], selectedConstituency.id], 4, 1.5]);
    fitMap(map, selectedConstituency.bounds, 140);
  }, [mapReady, selectedConstituency]);

  const resetIndia = () => {
    setSelectedStateId(null); setSelectedDistrictId(null); setSelectedConstituencyId(null); setHistory([]);
    setHoverLabel({ title: "India", subtitle: "Choose a state to explore" });
  };

  const goBack = () => {
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
          {searchOpen && query.length >= 2 && <div className="search-results" role="listbox">{searchResults.length ? searchResults.map((result) => <button key={`${result.kind}-${result.id}`} type="button" onClick={() => chooseSearchResult(result)}><span><strong>{result.title}</strong><small>{result.subtitle}</small></span><em>{result.kind === "mla" ? "MLA" : result.kind[0].toUpperCase()}</em></button>) : <div className="search-empty">No demo records match “{query}”.</div>}</div>}
        </div>
        <span className="demo-pill">Demo dataset</span>
      </header>

      <main className="workspace">
        <section className="map-column" aria-label="Interactive political map">
          <div ref={mapNode} className="map-canvas" />
          {!mapReady && <div className="map-loader"><span /><strong>Drawing the map</strong></div>}
          <div className="map-overlay-top">
            <div className="map-nav">{selectedState && <button type="button" className="back-button" onClick={goBack} aria-label="Go back one level"><Icon name="back" /></button>}<nav className="breadcrumbs" aria-label="Current map level"><button type="button" onClick={resetIndia}>India</button>{selectedState && <><b>/</b><button type="button" onClick={() => navigateToState(selectedState)}>{selectedState.name}</button></>}{selectedDistrict && <><b>/</b><button type="button" onClick={() => navigateToDistrict(selectedDistrict)}>{selectedDistrict.name}</button></>}{selectedConstituency && <><b>/</b><span>{selectedConstituency.name}</span></>}</nav></div>
            <button type="button" className="reset-button" onClick={resetIndia}><Icon name="home" /><span>India view</span></button>
          </div>
          <div className="map-status" aria-live="polite"><small>{selectedConstituency ? "Constituency" : selectedDistrict ? "District" : selectedState ? "State" : "Map focus"}</small><strong>{hoverLabel.title}</strong><span>{hoverLabel.subtitle}</span></div>
        </section>

        <aside className={`info-panel ${selectedConstituency ? "detail-panel" : ""}`} aria-live="polite">
          {isLoading ? <PanelSkeleton /> : selectedConstituency && selectedState && selectedDistrict && selectedRepresentative ? <ConstituencyPanel constituency={selectedConstituency} district={selectedDistrict} state={selectedState} representative={selectedRepresentative} history={history} /> : selectedDistrict && selectedState ? <DistrictPanel district={selectedDistrict} state={selectedState} constituencies={districtConstituencies} representatives={catalog.representatives} onSelect={navigateToConstituency} /> : selectedState ? <StatePanel state={selectedState} districts={stateDistricts} onSelect={navigateToDistrict} hoveredParty={hoveredParty} setHoveredParty={setHoveredParty} /> : <OverviewPanel states={catalog.states} onSelect={navigateToState} />}
        </aside>
      </main>
    </div></div>
  );
}

function OverviewPanel({ states, onSelect }: { states: StateRegion[]; onSelect: (state: StateRegion) => void }) {
  return <><div className="panel-scroll"><div className="kicker">National overview</div><h1 className="panel-title">India</h1><p className="panel-copy">Follow the map from a state to a constituency, then see the current representative and latest election result.</p><div className="metric-grid"><div className="metric"><strong>36</strong><span>States & union territories</span></div><div className="metric"><strong>2</strong><span>Full demo states</span></div></div><div className="section-rule" /><h2 className="mini-heading">Begin with a state</h2><div className="state-list">{states.map((state) => <button className="state-button" type="button" key={state.id} onClick={() => onSelect(state)}><span><strong>{state.name}</strong><small>{state.demoCoverage === "complete" ? `${state.districtCount} districts` : "Overview only"}</small></span><em>{state.constituencyCount}</em></button>)}</div></div><DemoNote /> </>;
}

function StatePanel({ state, districts, onSelect, hoveredParty, setHoveredParty }: { state: StateRegion; districts: District[]; onSelect: (district: District) => void; hoveredParty: string | null; setHoveredParty: (id: string | null) => void }) {
  const composition = Object.entries(state.partySeats).sort((a, b) => b[1] - a[1]);
  return <><div className="panel-scroll"><div className="kicker">State overview</div><h1 className="panel-title">{state.name}</h1><div className="metric-grid three"><div className="metric"><strong>{state.constituencyCount}</strong><span>Constituencies</span></div><div className="metric"><strong>{state.districtCount}</strong><span>Districts</span></div><div className="metric"><strong>{composition.length || "—"}</strong><span>Parties shown</span></div></div>{state.demoCoverage === "overview" ? <div className="empty-card"><Icon name="map" /><h2>Overview only</h2><p>Detailed demo districts are available for Karnataka and Telangana.</p></div> : <><section className="panel-section"><div className="section-heading"><div><span>Party representation</span><h2>Assembly composition</h2></div><small>{state.constituencyCount} seats</small></div><div className="assembly-dots" aria-label={`Sample assembly composition for ${state.name}`}>{composition.flatMap(([partyId, count]) => Array.from({ length: count }, (_, index) => <span key={`${partyId}-${index}`} style={{ backgroundColor: partyById[partyId]?.color }} className={hoveredParty && hoveredParty !== partyId ? "muted-dot" : ""} title={`${partyById[partyId]?.abbreviation} seat`} />))}</div><div className="party-list">{composition.map(([partyId, count]) => { const party = partyById[partyId]; return <button key={partyId} type="button" onMouseEnter={() => setHoveredParty(partyId)} onMouseLeave={() => setHoveredParty(null)} onFocus={() => setHoveredParty(partyId)} onBlur={() => setHoveredParty(null)}><i style={{ backgroundColor: party.color }} /><span><strong>{party.abbreviation}</strong><small>{party.name}</small></span><em>{count}</em></button>; })}</div></section><section className="panel-section"><div className="section-heading"><div><span>Demo geography</span><h2>Choose a district</h2></div><small>{districts.length} shown</small></div><div className="district-list">{districts.map((district) => <button type="button" key={district.id} onClick={() => onSelect(district)}><span><strong>{district.name}</strong><small>{district.constituencyCount} constituencies</small></span><b>View</b></button>)}</div></section></>}</div><DemoNote /></>;
}

function DistrictPanel({ district, state, constituencies, representatives, onSelect }: { district: District; state: StateRegion; constituencies: Constituency[]; representatives: MLA[]; onSelect: (item: Constituency) => void }) {
  return <><div className="panel-scroll"><div className="kicker">District · {state.name}</div><h1 className="panel-title">{district.name}</h1><p className="panel-copy">Select a highlighted constituency to see its representative and election history.</p><div className="section-rule" /><div className="section-heading"><div><span>Assembly areas</span><h2>Constituencies</h2></div><small>{constituencies.length} demo records</small></div><div className="constituency-list">{constituencies.map((item) => { const rep = representatives.find((record) => record.constituencyId === item.id); const party = rep ? partyById[rep.partyId] : null; return <button type="button" key={item.id} onClick={() => onSelect(item)}><span className="constituency-number">AC {item.constituencyNumber}</span><strong>{item.name}</strong>{rep && party ? <span className="rep-line"><i style={{ backgroundColor: party.color }} />{rep.name}<em>{party.abbreviation}</em></span> : <small>No representative record</small>}</button>; })}</div></div><DemoNote /></>;
}

function ConstituencyPanel({ constituency, district, state, representative, history }: { constituency: Constituency; district: District; state: StateRegion; representative: MLA; history: ElectionResult[] }) {
  const [expanded, setExpanded] = useState(false);
  const party = partyById[representative.partyId];
  const latest = history.at(-1);
  const latestWinner = latest?.candidates.find((candidate) => candidate.position === 1);
  useEffect(() => setExpanded(false), [constituency.id]);
  return <><div className="panel-scroll"><div className="kicker">Assembly constituency</div><h1 className="panel-title constituency-title">{constituency.name}</h1><p className="location-line">{district.name}<span>•</span>{state.name}</p><section className="mla-card"><div className="profile-avatar" style={{ backgroundColor: `${party.color}22`, color: party.color }}>{initials(representative.name)}</div><div><span>Current MLA</span><h2>{representative.name}</h2><p><i style={{ backgroundColor: party.color }} />{party.name}</p></div></section><div className="stat-strip"><div><Icon name="people" /><strong>{representative.currentTermStart}</strong><span>MLA since</span></div><div><Icon name="vote" /><strong>{representative.consecutiveWins}</strong><span>Consecutive wins</span></div><div><Icon name="map" /><strong>{latestWinner?.votePercentage ?? "—"}{latestWinner ? "%" : ""}</strong><span>{latest?.year ?? "Latest"} vote share</span></div><div><Icon name="vote" /><strong>{latest ? formatNumber(latest.winningMargin) : "—"}</strong><span>Winning margin</span></div></div><section className="panel-section timeline-section"><div className="section-heading"><div><span>Election history</span><h2>Winning timeline</h2></div></div><div className="timeline">{history.map((election) => { const winner = election.candidates.find((candidate) => candidate.position === 1); const winnerParty = winner ? partyById[winner.partyId] : null; return <div key={election.year}><span>{election.year}</span><i style={{ backgroundColor: winnerParty?.color }} /><strong>{winnerParty?.abbreviation}</strong></div>; })}</div></section><section className="panel-section"><div className="section-heading"><div><span>Latest result</span><h2>{latest?.year ?? "—"} election</h2></div>{latest && <small>Margin {formatNumber(latest.winningMargin)}</small>}</div><div className="result-bars">{latest?.candidates.slice(0, expanded ? undefined : 2).map((candidate) => { const candidateParty = partyById[candidate.partyId]; return <div key={candidate.candidateId} className="result-row"><div><span><strong>{candidate.candidateName}</strong><small>{candidateParty?.abbreviation}</small></span><em>{candidate.votePercentage}%</em></div><span className="bar-track"><i style={{ width: `${candidate.votePercentage}%`, backgroundColor: candidateParty?.color }} /></span><small>{formatNumber(candidate.votes)} votes</small></div>; })}</div>{latest && latest.candidates.length > 2 && <button type="button" className="expand-button" onClick={() => setExpanded((value) => !value)}>{expanded ? "Show leading candidates" : `Show all ${latest.candidates.length} entries`}</button>}</section></div><DemoNote /></>;
}

function DemoNote() { return <p className="sample-note"><strong>Sample data</strong><span>Names, totals and results are illustrative and not verified political records.</span></p>; }

function PanelSkeleton() { return <div className="panel-skeleton" aria-label="Loading political data"><span className="sk-line short"/><span className="sk-line title"/><span className="sk-line"/><div className="sk-grid"><span/><span/></div><span className="sk-line"/><span className="sk-line"/></div>; }
