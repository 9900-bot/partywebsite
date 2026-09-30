# India state/UT boundaries

`india-states.geojson` is the web-optimized state and union-territory layer used by `IndiaMap`.

- Upstream: `SOI_States.geojsonl.7z` from the `states` release of `ramSeraph/indian_admin_boundaries`.
- Original source identified by that release: Survey of India Administrative Boundary Database.
- Redistribution terms stated by the release: CC0 1.0; attribute DataMeet and the original government source where possible.
- Processing: disputed-overlap helper records are excluded from navigation, records are matched to LGD identifiers, application metadata is attached, and geometry is simplified with Mapshaper using `-simplify 8% keep-shapes`.

This is a geographic navigation layer, not a source of political or electoral information. Survey of India remains the authoritative reference; boundaries should be reviewed whenever the upstream administrative dataset changes.
