# Region labels and overlapping regions

## Goal
Show the "Região N" label only on the region being edited, and let a click on overlapping regions reach the region inside the other.

## Acceptance criteria
- [ ] Outside edit mode, no label is shown on the map.
- [ ] Clicking a region shows only its label, centered; it disappears on exit (outside click, `Esc`, "Concluir").
- [ ] The label follows the shape when points are added/removed and when the region is renumbered.
- [ ] A click where two or more regions overlap goes to the smallest one (including 1–2 client line/point regions).
- [ ] Clicking the part of a large region outside the small one still selects the large one.
- [ ] Points stay above every region.
- [ ] `npm run test`, `npm run lint` and `npx tsc --noEmit` pass.

## Decisions
- Label: render `<Tooltip permanent direction="center">` only when `state.editingRegion === shape.region`. No hover label.
- Re-centering: keep the effect that calls `openTooltip()` when the shape changes (`src/components/map-view.tsx:105`); without a bound tooltip it is a no-op.
- Click priority: in a canvas, Leaflet fires the click only on the last-drawn layer containing the point (`node_modules/leaflet/src/layer/vector/Canvas.js:359`). Region draw order follows area, largest at the back and smallest at the front, so Leaflet's own hit test picks the inner region with no custom geometry.
- Area: polygon → shoelace over `[lat, lng]`, absolute value, used only for ordering; line and point → `0`, always in front of polygons.
- Reordering: `scheduleRegionOrder` in `MapView` walks the registered region layers from smallest to largest area and calls `bringToBack()` on each, so the largest ends at the back and all stay behind the points. It is coalesced in a `queueMicrotask` and triggered by every `MapView` render (area changes on edits) and by each region layer's `add` event.
- Why the `add` event too (found during verification): a parent effect alone runs before StrictMode's simulated remount of newly mounted layers, which re-adds them on top of the points. Any re-add by react-leaflet would do the same in production.
- The per-layer `add: bringToBack` handler in `RegionLayer` becomes `add: onAdd` (schedules the reorder).

## Out of scope
- Hover labels.
- Cycling between overlapping regions with repeated clicks on the same spot.
- Changing the grouping algorithm to reduce overlaps.

## Reuse
- `src/components/map-view.tsx:95`: `RegionLayer` and its `setLayer` callback ref, which also registers the layer.
- `src/components/map-view.tsx:105`: tooltip re-centering effect.
- `src/lib/regions.ts:61`: `getRegionShapes` and the `RegionShape` type.

## Steps
1. Add `getShapeArea` to `src/lib/regions.ts`
   - Details: `export const getShapeArea = (shape: RegionShape): number`: polygon → `Math.abs(shoelace(positions)) / 2`; line and point → `0`.
   - Done when: step 4 tests pass.

2. Show the label only on the edited region in `src/components/map-view.tsx`
   - Details: in `RegionLayer`, `const tooltip = state.editingRegion === shape.region ? <Tooltip permanent direction="center">…</Tooltip> : null`.
   - Done when: no label without editing; clicking a region shows only its label.

3. Order region drawing by area in `src/components/map-view.tsx`
   - Details:
     - `MapView`: `regionLayersRef = useRef(new Map<string, { shape: RegionShape; layer: Path }>())`; `RegionLayer` gets `onLayer(layer | null)`, called from the existing callback ref (`set` / `delete`), and `onAdd`.
     - `scheduleRegionOrder`: guarded by `orderScheduledRef`, runs in `queueMicrotask`, sorts the registry by `getShapeArea` ascending and calls `bringToBack()` on each layer.
     - `useEffect(() => { scheduleRegionOrder(); })` (every render) and `add: onAdd` in `RegionLayer`'s `eventHandlers` instead of `add: bringToBack`.
   - Done when: clicking an intersection selects the smaller region; points stay clickable on top.

4. Add tests to `src/lib/regions.test.ts`
   - Done when: `npm run test` passes with the cases under Tests.

## Tests
- `getShapeArea`: closed square ring `[0,0] [0,1] [1,1] [1,0]` → `1`; same square in reverse order → `1`; 2×2 square larger than 1×1; `line` → `0`; `point` → `0`.

## Verification
- `npm run test`, `npm run lint`, `npx tsc --noEmit`: pass.
- Dev server, manual:
  - `103-clients.xlsx`, size 10 → no labels on the map.
  - Click a region → only its "Região N", centered. Remove edge points → the label follows the new center. Empty another region so the edited one is renumbered → the label shows the new number.
  - Exit by outside click, `Esc`, "Concluir" → label disappears.
  - `103-clients.xlsx`, size 51 (regions 1 and 2 overlap): click the intersection → edits the smaller region; click the large region's exclusive part → edits the large one; the 1-client circle inside a polygon → edits the 1-client group.
  - While editing, click a point inside the intersection → toggles the point, no region switch.
  - `5000-clients.xlsx`, size 10: editing responsiveness similar to before (500 `bringToBack` calls per change are batched into one canvas redraw).

## Risks
- Partially crossing regions: the smaller wins in the intersection even if the user meant the other. Accepted; each region's exclusive part stays clickable.
- Area in degrees distorts slightly with latitude; it does not change the order within one city or state.
- Effect order: StrictMode re-adds newly mounted layers after the parent effect; covered by the `add` event trigger (verified: first generation after a page load keeps regions behind points).
