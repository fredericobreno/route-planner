# Map points (task 04)

## Goal
Render each valid client as a `CircleMarker` on the existing Leaflet map and fit the view to them after import or a column change.

## Acceptance criteria
- [ ] All valid clients appear; invalid ones do not.
- [ ] The map fits the points after import and after a column change.
- [ ] Acceptable performance with a few thousand points (canvas renderer via `preferCanvas`).
- [ ] `npm run lint` and `npx tsc --noEmit` pass.

## Decisions
- Panes: points and region shapes share one canvas in the default `overlayPane` instead of separate panes. With `preferCanvas`, Leaflet creates one `<canvas>` per custom pane (`node_modules/leaflet/src/layer/vector/Renderer.getRenderer.js:26`), and the top canvas swallows clicks meant for the lower one, which would break region clicks in task 07. In a shared canvas the hit test picks the last-drawn layer (`node_modules/leaflet/src/layer/vector/Canvas.js:356`), so points stay on top as long as region shapes call `bringToBack()` when added (task 06).
- Point style: radius `5`, white `1px` stroke, `fillOpacity: 0.9`, neutral fill `#6b7280` (canvas cannot read CSS variables).
- `fitBounds` options: `padding: [32, 32]`, `maxZoom: 15` (a single point would otherwise zoom to the max).

## Out of scope
- Region shapes and region colors (task 06), clicks and editing (task 07).
- Tooltips/popups on points.

## Reuse
- `src/components/map-view.tsx:9`: `MapContainer` with `preferCanvas` and the OSM `TileLayer` with attribution already exist; points are added as children.
- `src/components/planner-provider.tsx`: `clients` from `usePlanner()` (added in task 03). It is memoized on `clientRows` + `columnMapping`, so its identity changes only on import, header change, or column change, never on grouping or editing.

## Steps
1. Make `src/components/map-view.tsx` render client points
   - Details: read `clients` via `usePlanner()`. Render `clients.map((client) => <CircleMarker key={client.rowIndex} center={[client.lat, client.lng]} radius={5} pathOptions={{ color: "#ffffff", weight: 1, fillColor: POINT_COLOR, fillOpacity: 0.9 }} />)` with `const POINT_COLOR = "#6b7280"`. No `pane` prop, so points go to the shared `overlayPane` canvas.
   - Done when: after import and column mapping, every valid client shows as a dot and invalid rows do not.

2. Add a `FitBounds` component inside `src/components/map-view.tsx` (new, file-local)
   - Why new: nothing in the code reacts to `clients` changes on the map; it needs `useMap()`, so it must be a child of `MapContainer`.
   - Details: `const FitBounds = ({ clients }: { clients: Client[] }) => { const map = useMap(); useEffect(() => { if (clients.length === 0) return; map.fitBounds(latLngBounds(clients.map(({ lat, lng }) => [lat, lng])), { padding: [32, 32], maxZoom: 15 }); }, [map, clients]); return null; }`. Render `<FitBounds clients={clients} />` inside `MapContainer`.
   - Done when: importing a file zooms to its points; changing lat/lng columns re-fits; generating groups does not move the map.

## Verification
- `npm run lint`: no errors.
- `npx tsc --noEmit`: no errors.
- Dev server (`preview_start` `dev`), manual:
  - Import a file with valid and invalid rows → only valid rows render; the map fits them.
  - Change the latitude or longitude select to another column → the map re-fits (a direct swap is not possible: the column picked in one select is disabled in the other).
  - Import ~5,000 rows → panning/zooming stays smooth; `document.querySelectorAll(".leaflet-overlay-pane canvas").length === 1` (no SVG paths).

## Risks
- Thousands of `CircleMarker` React components: each is a Leaflet layer on one canvas, which Leaflet handles well. If mount time is noticeably slow, that shows up in the 5,000-row manual check.
- `fitBounds` with all clients on the same coordinate: `latLngBounds` of identical points is valid and `maxZoom: 15` limits the zoom.
