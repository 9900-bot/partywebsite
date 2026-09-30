# Civic Atlas India

A frontend-only, map-first prototype for exploring political representation across India. The experience moves from India to a state, district and assembly constituency, then presents a compact representative profile and election history.

> All political names, totals and election results shown in the demo are illustrative sample data. They are not verified production records.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production export:

```bash
npm run typecheck
npm run build
```

The static site is written to `out/`.

## Main structure

```text
app/
  globals.css              Visual system and responsive layouts
  layout.tsx               Metadata and global assets
  page.tsx                 Application entry point
components/
  political-explorer.tsx   Map, search, navigation and detail panels
data/
  political-states.ts      State summaries and party seat totals
  districts.ts             Demo district geometry and metadata
  constituencies.ts        Demo constituency geometry and metadata
  representatives.ts       Current representative records
  elections.ts             Historical and latest election results
  parties.ts               Centralized party names and colours
lib/
  political-data-source.ts Replaceable data-access implementation
types/
  political.ts             Normalized TypeScript models
public/
  india-states.geojson     Local state boundary layer
```

## Data model

The UI uses normalized records joined by stable IDs:

- `StateRegion` contains state counts, map bounds and party seat totals.
- `District` belongs to a state and includes demo map geometry.
- `Constituency` belongs to a district and state.
- `MLA` links to one constituency and one party.
- `ElectionResult` contains ordered candidate results for a constituency and year.
- `Party` is the single source of party labels and colours.

`LocalPoliticalDataSource` implements the `PoliticalDataSource` interface. Components ask this abstraction for states, districts, constituencies, representatives and election history instead of reading serialized records directly.

## Replacing mock data with CSV or Excel

Create a `RemotePoliticalDataSource` that implements the same interface in `types/political.ts`:

1. Fetch a CSV, JSON or converted Excel endpoint.
2. Parse and normalize rows into the existing models.
3. Validate foreign keys such as `stateId`, `districtId`, `constituencyId` and `partyId`.
4. Cache the normalized catalog in memory if appropriate.
5. Export the remote implementation as `politicalDataSource` from `lib/political-data-source.ts`.

Because the application depends on the interface rather than the local arrays, the map and panels do not need to be rewritten. For direct `.xlsx` files, add a browser-compatible spreadsheet parser or convert the workbook to CSV/JSON at its source.

## Accessibility and neutrality

- Navigation is available through the map, search, buttons and breadcrumbs.
- Party affiliation always appears as text as well as colour.
- Important numbers are printed next to charts and bars.
- Reduced-motion preferences are respected.
- The global theme is neutral; party colours are used only to encode party-specific data.
