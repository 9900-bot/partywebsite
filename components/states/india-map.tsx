"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as maplibregl from "maplibre-gl";

const SOURCE_ID = "india-states";
const FILL_ID = "india-states-fill";
type MapStatus = "loading" | "ready" | "error";

export function IndiaMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoveredIdRef = useRef<string | number | null>(null);
  const router = useRouter();
  const [status, setStatus] = useState<MapStatus>("loading");
  const [activeName, setActiveName] = useState("Move over a state or union territory");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const controller = new AbortController();
    let disposed = false;
    setStatus("loading");

    async function initialize() {
      try {
        maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
        const response = await fetch("/api/geo/states", { signal: controller.signal });
        if (!response.ok) throw new Error("GeoJSON request failed");
        const geojson = await response.json();
        if (disposed || !containerRef.current) return;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#eef2f5" } }] },
          bounds: [[67.2, 6.2], [97.6, 37.6]],
          fitBoundsOptions: { padding: 34 },
          maxBounds: [[60, 0], [105, 43]],
          minZoom: 2.7,
          maxZoom: 8,
          attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new maplibregl.AttributionControl({ customAttribution: "Boundaries: Survey of India-derived · DataMeet" }), "bottom-right");
        map.on("load", () => {
          if (disposed) return;
          map.addSource(SOURCE_ID, { type: "geojson", data: geojson, generateId: false });
          map.addLayer({ id: FILL_ID, type: "fill", source: SOURCE_ID, paint: { "fill-color": ["case", ["boolean", ["feature-state", "selected"], false], "#b6402c", ["boolean", ["feature-state", "hover"], false], "#d8795e", "#dbe2e8"], "fill-opacity": 0.94, "fill-outline-color": "#ffffff" } });
          map.addLayer({ id: "india-states-line", type: "line", source: SOURCE_ID, paint: { "line-color": "#738093", "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.6, 7, 1.4] } });
          setStatus("ready");
        });
        map.on("mousemove", FILL_ID, (event: maplibregl.MapLayerMouseEvent) => {
          const feature = event.features?.[0] as maplibregl.MapGeoJSONFeature | undefined;
          if (!feature?.id) return;
          if (hoveredIdRef.current !== null) map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
          hoveredIdRef.current = feature.id;
          map.setFeatureState({ source: SOURCE_ID, id: feature.id }, { hover: true });
          setActiveName(String(feature.properties.name));
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", FILL_ID, () => {
          if (hoveredIdRef.current !== null) map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
          hoveredIdRef.current = null;
          map.getCanvas().style.cursor = "";
          setActiveName("Move over a state or union territory");
        });
        map.on("click", FILL_ID, (event: maplibregl.MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature?.id || !feature.properties.slug) return;
          map.setFeatureState({ source: SOURCE_ID, id: feature.id }, { selected: true });
          router.push(`/states/${feature.properties.slug}`);
        });
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) setStatus("error");
      }
    }
    initialize();
    return () => { disposed = true; controller.abort(); mapRef.current?.remove(); mapRef.current = null; };
  }, [attempt, router]);

  return <section aria-labelledby="india-map-heading" className="overflow-hidden border border-[#dfe4eb] bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe4eb] px-5 py-4"><div><span className="eyebrow">Interactive map</span><h2 id="india-map-heading" className="mt-1 text-xl font-black tracking-[-.03em]">India</h2></div><div aria-live="polite" className="min-h-9 rounded-sm bg-[#10223d] px-4 py-2 text-sm font-semibold text-white">{status === "ready" ? activeName : status === "loading" ? "Loading map…" : "Map unavailable"}</div></div><div className="relative h-[520px] sm:h-[620px]"><div ref={containerRef} aria-label="Interactive map of Indian states and union territories" className="h-full w-full" />{status === "loading" && <div className="absolute inset-0 grid place-items-center bg-[#eef2f5]"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#b6402c] border-t-transparent" /><p className="mt-4 text-sm font-semibold text-[#5b6475]">Loading state boundaries…</p></div></div>}{status === "error" && <div className="absolute inset-0 grid place-items-center bg-[#eef2f5] p-6"><div className="max-w-sm text-center"><h3 className="text-xl font-black">Map data could not be loaded.</h3><p className="mt-2 text-sm leading-6 text-[#5b6475]">The state list remains available. You can also try loading the map again.</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-5 bg-[#10223d] px-5 py-3 text-sm font-bold text-white hover:bg-[#b6402c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b6402c]">Retry map</button></div></div>}</div></section>;
}
