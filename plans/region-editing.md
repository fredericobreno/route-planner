# Region editing (task 07)

## Goal
Let the user click a region to edit it, then click points to remove them from or add them to that region, with renumbering and three ways to exit.

## Acceptance criteria
- [ ] Clicking a region starts editing; clicking another region switches.
- [ ] Clicking a point of the edited region removes it; a point without region or from another region is added.
- [ ] A removed point shows only as a point, without a polygon.
- [ ] Exit by clicking outside, `Esc`, and "Concluir".
- [ ] An empty region is removed and regions are renumbered without gaps.
- [ ] `npm run lint` and `npx tsc --noEmit` pass.

## Decisions
- Event propagation: shape and point click handlers call `L.DomEvent.stopPropagation(e)` so the map `click` (exit) does not fire. In the shared canvas (task 04 plan) the hit test returns only the top-most layer, so a point over a polygon fires the point, not the polygon.
- Highlight (no change when not editing):
  - polygon: edited `weight: 4`, `fillOpacity: 0.35`; others `opacity: 0.4`, `fillOpacity: 0.08`.
  - line and point: only opacity changes, since `weight: 24` / `radius: 12` are the 12 px buffer. Line: edited `opacity: 0.6`, others `opacity: 0.15`. Point: edited `fillOpacity: 0.6`, others `fillOpacity: 0.15`.
- `Esc` listener lives in the sidebar editing banner, mounted only while editing.

## Out of scope
- Undo, drag-to-select, or keyboard editing of points.

## Reuse
- `src/lib/planner.ts:78`: `togglePoint` action already declared (returns `state` today); this task implements it.
- `src/lib/planner.ts:80`: `startEditing` / `stopEditing` already work.
- `src/lib/planner.ts:101`: `renumberRegions` closes gaps keeping order.
- `src/lib/regions.ts` (task 06): `getRegionLabel`, shapes, colors.
- `src/components/map-view.tsx` (tasks 04/06): shape and point layers get click handlers and highlight styles.

## Steps
1. Add `togglePointAssignment` to `src/lib/planner.ts` and use it in the `togglePoint` case
   - Details: `export const togglePointAssignment = (assignments: Map<number, number>, rowIndex: number, editingRegion: number): { assignments: Map<number, number>; editingRegion: number | null }`
     - Copy the map; if `get(rowIndex) === editingRegion` → `delete`, else `set(rowIndex, editingRegion)`.
     - Pick any `rowIndex` still in `editingRegion` (before renumbering); none → `editingRegion: null`.
     - `renumberRegions(copy)`; the new `editingRegion` = renumbered value of that picked `rowIndex`.
   - Reducer: `case "togglePoint": if (state.editingRegion === null) return state; return { ...state, ...togglePointAssignment(state.assignments, action.rowIndex, state.editingRegion) };`
   - Done when: step 4 tests pass.

2. Add click handling and highlight in `src/components/map-view.tsx`
   - Details:
     - Shapes: `eventHandlers.click = (e) => { L.DomEvent.stopPropagation(e); if (state.editingRegion !== region) dispatch({ type: "startEditing", region }); }`. Style per Decisions based on `state.editingRegion`.
     - Points: `eventHandlers.click = (e) => { L.DomEvent.stopPropagation(e); if (state.editingRegion !== null) dispatch({ type: "togglePoint", rowIndex: client.rowIndex }); }`. Outside editing the click is still stopped and does nothing.
     - New file-local `MapClickExit` component (needs `useMapEvents`, so it must be a child of `MapContainer`): `useMapEvents({ click: () => { if (editingRegion !== null) dispatch({ type: "stopEditing" }); } })`.
   - Done when: clicking a region highlights it; clicking points moves them; clicking empty map exits.

3. Create `src/components/editing-banner.tsx` (new) and render it in `src/components/app-sidebar.tsx` below `GroupingForm`
   - Why new: no sidebar UI shows editing state; it also owns the `Esc` listener.
   - Details: returns `null` when `state.editingRegion === null`. Otherwise a `SidebarGroup` with "Editando {getRegionLabel(editingRegion)}" (color swatch from `getRegionColor`) and a "Concluir" `Button` dispatching `stopEditing`. `useEffect` adds a `keydown` listener on `window`: `Escape` → `stopEditing`; cleanup on unmount.
   - Done when: banner shows while editing; "Concluir" and `Esc` exit.

4. Add tests to `src/lib/planner.test.ts`
   - Done when: `npm run test` passes with the cases under Tests.

## Tests
- `togglePointAssignment`:
  - point in the edited region → removed (key absent).
  - unassigned point → added to the edited region.
  - point from another region → moved to the edited region.
  - removing the last point of region 2 out of {1, 2, 3} → regions become {1, 2} and `editingRegion` → `null`.
  - editing region 3 while region 2 becomes empty (its last point moved into 3) → region 3 becomes 2 and `editingRegion` → `2`.
  - input map is not mutated.
- `plannerReducer` `togglePoint` with `editingRegion: null` → returns the same state.

## Verification
- `npm run test`, `npm run lint`, `npx tsc --noEmit`: pass.
- Dev server, manual:
  - Click region 2 → highlighted, banner "Editando Região 2"; click region 3 → switches.
  - Click a point of region 3 → it loses color and the hull shrinks; click it again → back in region 3.
  - Click a point of region 1 → it moves to region 3.
  - Remove every point of a region → it disappears and labels renumber without gaps.
  - Exit by empty-map click, `Esc`, and "Concluir".
  - Click a point outside edit mode → nothing happens.

## Risks
- `Esc` while an `AlertDialog` is open also exits editing: harmless, the dialog closes too.
- Dragging the map ends with a `click` on some browsers: Leaflet suppresses clicks after a drag (`_draggableMoved`), so panning does not exit editing.
