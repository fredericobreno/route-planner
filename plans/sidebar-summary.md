# Sidebar summary (task 09)

## Goal
Show a "Resumo" card in the sidebar with import, validation, and region counts derived from the state.

## Acceptance criteria
- [ ] Summary shows after import with correct numbers.
- [ ] Summary reflects edits and stays visible after export.
- [ ] Clients per region + clients without region = valid clients.
- [ ] `npm run lint` and `npx tsc --noEmit` pass.

## Decisions
- "Clientes importados" = every non-empty row below the header (`clientRows.length`), valid and invalid.
- Before both columns are selected, the card shows only "Clientes importados"; the other lines appear once `columnMapping` is set.
- Visibility: the card renders whenever `state.sheet` is set. All values are derived, so it is up to date after import, grouping, editing, and export without extra state.
- Long region list: `max-h-48 overflow-y-auto` on the list (no `scroll-area` component added).

## Out of scope
- Charts or per-region details beyond the count.

## Reuse
- `src/components/planner-provider.tsx`: `clientRows`, `clients`, `invalidRowIndexes` (task 03).
- `src/lib/regions.ts` (task 06): `getRegionColor`, `getRegionLabel`.
- `src/components/ui/card.tsx`: `Card`, `CardHeader`, `CardTitle`, `CardContent`.
- `src/components/ui/separator.tsx`: between the totals and the region list.

## Steps
1. Add `getSummary` to `src/lib/planner.ts`
   - Details: `export const getSummary = (clients: Client[], assignments: Map<number, number>): { regions: { region: number; count: number }[]; unassigned: number }`: count `assignments.get(client.rowIndex)` over `clients` only (so stale keys never count), regions sorted ascending, `unassigned` = clients with no region.
   - Done when: step 3 tests pass.

2. Create `src/components/summary-card.tsx` (new) and render it in `src/components/app-sidebar.tsx` after `EditingBanner`
   - Why new: no summary UI exists.
   - Details: returns `null` without `state.sheet`. `Card` "Resumo" with label/value rows:
     - "Clientes importados": `clientRows.length`.
     - When `state.columnMapping`: "Coordenadas inválidas": `invalidRowIndexes.length`; "Grupos na tela": `regions.length`; "Clientes sem região": `unassigned`.
     - When `regions.length > 0`: `Separator` + list `max-h-48 overflow-y-auto` of `<li>` with a `size-2.5 rounded-full` swatch (`style={{ backgroundColor: getRegionColor(region) }}`) and "{getRegionLabel(region)} — {count} clientes".
     - `useMemo` for `getSummary(clients, state.assignments)`.
   - Done when: the manual checks under Verification pass.

3. Add tests to `src/lib/planner.test.ts`
   - Done when: `npm run test` passes with the cases under Tests.

## Tests
- `getSummary`: 5 clients, assignments `{a: 1, b: 1, c: 2}` → regions `[{1, 2}, {2, 1}]`, `unassigned: 2`; sum of counts + `unassigned` = `clients.length`.
- `getSummary` ignores assignment keys that are not in `clients`.
- `getSummary` with no assignments → `regions: []`, `unassigned: clients.length`.

## Verification
- `npm run test`, `npm run lint`, `npx tsc --noEmit`: pass.
- Dev server, manual:
  - Import → card shows "Clientes importados" only; select columns → invalid count, 0 groups, all clients without region.
  - Generate groups → per-region list with colors matching the map; sum + without region = importados − inválidas.
  - Edit a region → counts update; export → card still shown with the same numbers.
  - 100+ regions → list scrolls inside the card.

## Risks
- The sidebar gets tall with import, grouping, editing, and summary sections: `SidebarContent` already scrolls; check during task 10 layout review.
