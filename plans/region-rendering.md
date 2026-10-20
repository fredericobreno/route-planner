# Region rendering (task 06)

## Goal
Draw each group as a region on the map: convex hull polygon, or a screen-space buffered line/point for 1–2 points, with a distinct color and a permanent "Região N" label.

## Acceptance criteria
- [ ] Each group shows as a convex hull polygon with a distinct color.
- [ ] Groups with 1–2 points (or collinear points) show as a line/point with a 12 px buffer that stays constant while zooming.
- [ ] "Região N" label visible on each region.
- [ ] `npm run lint` and `npx tsc --noEmit` pass.

## Decisions
- Panes: region shapes share the `overlayPane` canvas with the points (see task 04 plan). Each shape calls `bringToBack()` on its `add` event so points stay on top for drawing and click hit-testing.
- Colors: golden-angle HSL, `hsl(${(region * 137.508) % 360} 70% 45%)`. It gives distinct hues for any number of regions without a fixed palette size.
- Shape style: `color` = region color, `weight: 2`, `fillOpacity: 0.2` for polygons; `opacity: 0.35` for the 24 px polyline and the radius-12 circle so the point stays visible inside.
- Memoization: one `useMemo` over `clients` + `assignments` computes all shapes. A convex hull over ≤ 5,000 points takes a few ms, so per-region caching adds code without a measurable gain.
- Collinear / duplicate handling: points are de-duplicated by `lat,lng`; 1 unique point → point; all unique points collinear (cross product `|c| < 1e-12`) → line between the two extreme points (min/max after sorting by `lng`, then `lat`); otherwise polygon.

## Out of scope
- Click interaction and edit highlighting (task 07).

## Reuse
- `@turf/convex` + `@turf/helpers` (already installed): `convex(featureCollection(points.map(([lat, lng]) => point([lng, lat]))))` for 3+ non-collinear points.
- `src/components/map-view.tsx`: points from task 04; their `fillColor` switches from `POINT_COLOR` to the region color.
- `src/lib/planner.ts:24`: `assignments: Map<rowIndex, region>` is the only input besides `clients`.
- react-leaflet `Polygon`, `Polyline`, `CircleMarker`, `Tooltip` (already installed).

## Steps
1. Create `src/lib/regions.ts` (new)
   - Why new: no geometry or color code exists; it is shared by the map (this task), the summary (task 09), and editing (task 07).
   - Details:
     - `export type RegionShape = { region: number; color: string } & ({ kind: "polygon"; positions: LatLngTuple[] } | { kind: "line"; positions: [LatLngTuple, LatLngTuple] } | { kind: "point"; position: LatLngTuple })`.
     - `export const getRegionColor = (region: number) => \`hsl(${(region * 137.508) % 360} 70% 45%)\``.
     - `export const getRegionLabel = (region: number) => \`Região ${region}\``.
     - `export const getRegionShapes = (clients: Client[], assignments: Map<number, number>): RegionShape[]`: group clients by region, de-duplicate, classify (point / line / polygon) as in Decisions, polygon positions from the turf hull ring converted back to `[lat, lng]`. Sorted by region ascending.
   - Done when: step 4 tests pass.

2. Render shapes in `src/components/map-view.tsx`
   - Details: `const shapes = useMemo(() => getRegionShapes(clients, state.assignments), [clients, state.assignments])`. Render shapes before the points in JSX. Per kind:
     - polygon: `<Polygon positions pathOptions={{ color, weight: 2, fillOpacity: 0.2 }} />`
     - line: `<Polyline positions pathOptions={{ color, weight: 24, lineCap: "round", opacity: 0.35 }} />`
     - point: `<CircleMarker center={position} radius={12} pathOptions={{ color, weight: 0, fillColor: color, fillOpacity: 0.35 }} />`
     - each with `key={\`${region}-${kind}\`}` (so a kind change remounts), `eventHandlers={{ add: (e) => e.target.bringToBack() }}`, and `<Tooltip permanent direction="center">{getRegionLabel(region)}</Tooltip>`.
   - Done when: after "Gerar grupos", every region is drawn under its points with a label.

3. Color points by region in `src/components/map-view.tsx`
   - Details: `fillColor: region ? getRegionColor(region) : POINT_COLOR`, with `region = state.assignments.get(client.rowIndex)`.
   - Done when: points share their region's color; points without a region stay neutral.

4. Create `src/lib/regions.test.ts` (new)
   - Done when: `npm run test` passes with the cases under Tests.

## Tests
- `getRegionShapes`: 1 client → `point`; 2 clients → `line`; 3 collinear clients → `line` with the two extreme points; 3 identical clients → `point`; 4 clients forming a square + 1 inside → `polygon` whose ring contains only the 4 corners (+ closing point); clients without assignment are ignored; shapes sorted by region.
- `getRegionColor`: different values for regions 1..50.
- `getRegionLabel(3)` → `"Região 3"`.

## Verification
- `npm run test`, `npm run lint`, `npx tsc --noEmit`: pass.
- Dev server, manual:
  - Generate groups → each region has a distinct color, polygon, and centered "Região N" label.
  - Size such that a group has 1 or 2 points → round line/circle; zooming in and out keeps its on-screen thickness.
  - Points are drawn above the polygons.

## Risks
- `Tooltip permanent` on a polyline is placed at the line's center and on a polygon at its centroid: matches "center of the region".
- Many regions (hundreds) mean hundreds of permanent tooltips (DOM elements): acceptable for the expected sizes; visible overlap at low zoom is cosmetic.
- turf takes `[lng, lat]` while Leaflet takes `[lat, lng]`: covered by the polygon test.
