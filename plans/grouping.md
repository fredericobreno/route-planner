# Group generation (task 05)

## Goal
Add a "Clientes por grupo" input and a "Gerar grupos" button that split valid clients into groups of exact size through a capacity-constrained k-means.

## Acceptance criteria
- [ ] 103 clients, size 10 → 10 groups of 10 + 1 group of 3.
- [ ] 100 clients, size 10 → 10 groups of 10.
- [ ] Size larger than the total → 1 group.
- [ ] No valid client is left without a group; invalid clients never enter one.
- [ ] Generating again with existing groups asks for confirmation.
- [ ] Runs in under 2 s for ~5,000 clients.
- [ ] Vitest unit tests for the size scenarios above.
- [ ] `npm run test`, `npm run lint` and `npx tsc --noEmit` pass.

## Decisions
- Assignment step: greedy per client instead of sorting every (client, centroid) pair. Clients are sorted by distance to their nearest centroid, then each goes to the nearest centroid that still has capacity. This is O(n·k) per iteration; sorting all pairs is O(n·k·log(n·k)) and goes over 2 s with small sizes (5,000 clients, size 2 → 12.5M pairs).
- Iterations: up to 10, stopping early when no assignment changes.
- Remainder: the last centroid (index `k - 1`) gets the smaller capacity; regions are numbered by centroid index, so "Região k" is the remainder group.
- Input starts empty with a placeholder; the button stays disabled until it holds an integer ≥ 1.
- Randomness: `groupClients` takes `random = Math.random` so tests are deterministic.

## Out of scope
- Drawing regions (task 06), editing (task 07).

## Reuse
- `src/lib/planner.ts:72`: `setGroups` already replaces all assignments and clears `editingRegion`, so dispatching it covers "discard groups and edits".
- `src/lib/planner.ts:12`: `Client` type is the algorithm input.
- `src/components/planner-provider.tsx`: `clients` from `usePlanner()` (task 03) only holds valid clients, so invalid rows never reach the algorithm.
- `src/components/ui/input.tsx`, `label.tsx`, `button.tsx`, `alert-dialog.tsx`: existing shadcn components.
- `src/components/sheet-import.tsx` (task 03): same `AlertDialog` confirmation pattern for "replace existing data".

## Steps
1. Create `src/lib/grouping.ts` (new)
   - Why new: no clustering code exists, and keeping it apart from the reducer keeps `planner.ts` focused on state.
   - Details: `export const groupClients = (clients: Client[], size: number, random: () => number = Math.random): Map<number, number>`
     - `n === 0` → empty `Map`.
     - `size >= n` → every client in region `1`.
     - `size === 1` → client `i` (input order) in region `i + 1`.
     - Projection: `x = lng * cos(meanLat in radians)`, `y = lat`; squared Euclidean distance.
     - `k = Math.ceil(n / size)`; `capacities[i] = size` for `i < k - 1`, `capacities[k - 1] = n - (k - 1) * size`.
     - Init: k-means++ with `random`. If every remaining squared distance is `0` (duplicate coordinates), pick a uniformly random unused client.
     - Loop (max 10): for each client compute the nearest-centroid distance; sort client indexes by it ascending; assign each to the nearest centroid with `remaining > 0` (scan all `k`); recompute centroids as the mean of their members; stop if assignments did not change.
     - Return `Map<rowIndex, centroidIndex + 1>`.
   - Done when: the step 3 tests pass.

2. Create `src/components/grouping-form.tsx` (new) and render it in `src/components/app-sidebar.tsx` below `SheetImport`
   - Why new: the sidebar has no grouping UI yet; it gets its own component so `sheet-import.tsx` stays about import.
   - Details:
     - `SidebarGroup` with `Label htmlFor="group-size"` "Clientes por grupo" and `Input id="group-size" type="number" min={1} step={1} placeholder="Ex.: 10"`. Local `value` state (string).
     - `const size = Number(value); const isValid = Number.isInteger(size) && size >= 1;`
     - "Gerar grupos" `Button` disabled when `clients.length === 0 || !isValid`.
     - Click: if `state.assignments.size > 0`, open an `AlertDialog` ("Gerar novos grupos?" / "Os grupos e edições atuais serão descartados."); else run directly. Running = `dispatch({ type: "setGroups", assignments: groupClients(clients, size) })`.
   - Done when: the button generates groups, and a second click shows the confirmation; cancel keeps the groups.

3. Create `src/lib/grouping.test.ts` (new)
   - Details: cases listed under Tests, using a seeded `random` (small LCG defined in the test file).
   - Done when: `npm run test` passes.

## Tests
- 103 clients, size 10 → 11 regions; 10 with 10 clients and region 11 with 3.
- 100 clients, size 10 → 10 regions of 10.
- 7 clients, size 50 → one region `1` with all 7.
- Size 1 → `n` regions of 1.
- Every input `rowIndex` is a key in the result, and only those (invalid rows are never in `clients`).
- Region numbers are exactly `1..k`.
- Duplicate coordinates (20 identical clients, size 5) → 4 regions of 5, no crash.
- Empty input → empty `Map`.
- Performance: 5,000 random clients in a Brazil-like box, size 10, finishes in < 2000 ms (`performance.now()` around the call). Same check with size 2.

## Verification
- `npm run test`: all tests pass, including the performance cases.
- `npm run lint`: no errors.
- `npx tsc --noEmit`: no errors.
- Dev server, manual: import a file, set size, "Gerar grupos" → `state.assignments` filled (visible on the map after task 06 and in the summary after task 09); click again → confirmation dialog; cancel → unchanged.

## Risks
- Greedy assignment can leave some far-away clients in a distant group when nearby groups are full: accepted trade-off for exact sizes; the user fixes edge cases in task 07.
- The size-2 performance test can be slow on CI machines: k-means++ init (n·k with incremental min-distance updates) plus 10 iterations of 2·n·k is ~260M distance computations for k = 2,500. Store coordinates in `Float64Array`s to keep the inner loops tight; if it still fails, the iteration cap is the lever.
