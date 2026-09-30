# India state/UT boundaries

`india-states.geojson` is the web-optimized state and union-territory layer used by `IndiaMap`.

- Upstream: `SOI_States.geojsonl.7z` from the `states` release of `ramSeraph/indian_admin_boundaries`.
- Original source identified by that release: Survey of India Administrative Boundary Database.
- Redistribution terms stated by the release: CC0 1.0; attribute DataMeet and the original government source where possible.
- Processing: disputed-overlap helper records are excluded from navigation, records are matched to LGD identifiers, application metadata is attached, and geometry is simplified with Mapshaper using `-simplify 8% keep-shapes`.

This is a geographic navigation layer, not a source of political or electoral information. Survey of India remains the authoritative reference; boundaries should be reviewed whenever the upstream administrative dataset changes.

## District and Assembly constituency boundaries

The generated files in `public/boundaries/` cover the complete Karnataka and Telangana drill-down used by Civic Atlas:

- 64 LGD districts: 31 in Karnataka and 33 in Telangana.
- 343 Assembly constituencies: 224 in Karnataka and 119 in Telangana.
- District source: `LGD_Districts.geojsonl.7z` (release dated 2023-12-11), identified upstream as LGD/BharatMaps.
- Constituency source: `LGD_Assembly_Constituencies.geojsonl.7z` (release dated 2023-12-12), identified upstream as LGD/BharatMaps/ECI-linked data.
- Processing: source coordinates are retained without simplification. Feature properties are normalized for the app, constituencies are related to the current district polygons spatially, the empty Karnataka AC 0 placeholder is excluded, and Bhadrachalam AC 119 is normalized to Telangana/Bhadradri Kothagudem.

Regenerate the browser files with `scripts/prepare-political-boundaries.mjs`, passing the two extracted GeoJSONL paths. The generated `catalog.json` includes the exact upstream service URLs and release metadata. These boundaries are accurate to the cited 2023 release and should not be described as a live 2026 legal record without a newer official release review.
