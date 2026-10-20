# File import (task 03)

## Goal
Let the user upload an `.xlsx`/`.xls`/`.csv` file, pick the header row from a preview, map latitude/longitude columns, and derive valid clients plus invalid row indexes through a pure validation function.

## Acceptance criteria
- [ ] Accepts `.xlsx`, `.xls`, `.csv`; reads only the first sheet.
- [ ] Preview lets the user pick the header row; rows above it do not become clients.
- [ ] Selects list the headers of the chosen row.
- [ ] `"-3,7319"` becomes `-3.7319` (including inside a quoted CSV cell).
- [ ] Empty, non-numeric and out-of-range coordinates count as invalid.
- [ ] A new upload with data loaded asks for confirmation; cancel keeps the state.
- [ ] Fully empty rows are ignored.
- [ ] Unreadable or empty file shows an error in the sidebar and keeps the previous state.
- [ ] Vitest unit tests for coordinate validation, header not on the first row, and empty-row skipping.
- [ ] `npm run test`, `npm run lint` and `npx tsc --noEmit` pass.

## Decisions
- Where is the header preview shown: in a `Dialog` (shadcn `dialog` + `table` added via CLI).
- How is the header picked: clicking a row highlights it; a "Confirmar" button applies and closes. Closing without confirming keeps the current header. A "Alterar cabeçalho" button in the sidebar reopens the dialog.
- Initial header: first non-empty row, pre-selected on load; the dialog opens automatically after a successful load.
- Replacement order: pick file → read it → if it reads fine and data is loaded, open the `AlertDialog`. An unreadable file shows the error without opening the dialog.
- Preview rows: first 10 non-empty rows, each with its original row number (1-based).
- Select labels for empty/duplicate headers: empty → `Coluna C`; duplicates → `Lat (C)`, `Lat (F)`. The select value is always the column index.
- Same column in both selects: blocked; the column picked in one select is disabled in the other.
- Error UI: shadcn `alert` (destructive), added via CLI.
- Export fidelity (from task 08 planning): `Sheet` also keeps the original first worksheet and its name, so the export writes only the `Região` column into it and preserves number/date formats.

## Out of scope
- Rendering points on the map (task 04).
- Summary counts in the sidebar (task 09).
- Export (task 08), beyond keeping `rawRows` aligned with the original sheet rows.

## Reuse
- `src/lib/planner.ts:1`: `ColumnMapping`, `Client`, `ClientRow` types reused as-is; `Sheet` gains two fields (step 2).
- `src/lib/planner.ts:52`: `loadSheet` already starts from `createInitialState()`, so dispatching `loadSheet` alone covers the spec's "`reset` + load".
- `src/lib/planner.ts:56`: `setHeaderRow` already clears `columnMapping`, `assignments` and `editingRegion`.
- `src/lib/planner.ts:64`: `setColumnMapping` already clears groups and edits.
- `src/lib/planner.ts:87`: `isEmptyCell` reused for empty-row detection and empty-coordinate checks.
- `src/lib/planner.ts:90`: `getHeaders` feeds the column selects.
- `src/lib/planner.ts:96`: `getClientRows` already skips rows above the header and fully empty rows; it gets tests and feeds the validation.
- `src/components/planner-provider.tsx:38`: derived values via `useMemo`; `clients` and `invalidRowIndexes` are added the same way.
- `src/components/ui/alert-dialog.tsx`, `select.tsx`, `button.tsx`, `label.tsx`: existing shadcn components for confirmation, column selects and upload button.
- SheetJS `utils.encode_col`: column letters for select labels (no custom implementation).

## Steps
1. Add shadcn components in `src/components/ui/`
   - Details: `npx shadcn@latest add dialog table alert`. Their only npm dependency is `cn`, already in `package.json`.
   - Done when: `dialog.tsx`, `table.tsx`, `alert.tsx` exist and `package.json` dependencies are unchanged.

2. Add pure helpers to `src/lib/planner.ts`
   - Details:
     - `Sheet` gets `sheetName: string` and `worksheet: WorkSheet` (`import type { WorkSheet } from "xlsx"`), used by the export in task 08.
     - `isEmptyRow = (cells: unknown[]) => Array.from(cells).every(isEmptyCell)`; `getClientRows` uses it instead of its inline check.
     - `getFirstNonEmptyRowIndex = (rows: unknown[][]): number | null`.
     - `getPreviewRows = (rows: unknown[][], limit = 10): ClientRow[]`: first `limit` non-empty rows with their original `rowIndex`.
     - `parseCoordinate = (value: unknown, limit: number): number | null`: empty → `null`; `String(value).trim().replace(",", ".")`; `Number(...)`; `null` unless `Number.isFinite` and `-limit <= n <= limit`.
     - `getClients = (rows: ClientRow[], mapping: ColumnMapping): { clients: Client[]; invalidRowIndexes: number[] }`: lat with limit `90`, lng with limit `180`; a row is invalid if either is `null`.
   - Done when: functions are exported and covered by step 8 tests.

3. Create `src/lib/sheet.ts` (new)
   - Why new: SheetJS file parsing does not belong in the reducer module and nothing existing reads files.
   - Details:
     - CSV encoding: SheetJS reads a UTF-8 CSV without BOM as Latin-1 (`"Região"` → `"RegiÃ£o"`), which garbles the selects and breaks the `Região` match in the export. For `.csv` files, decode first with `new TextDecoder("utf-8", { fatal: true })`, falling back to `new TextDecoder("windows-1252")` when it throws, and parse with `read(text, { type: "string", raw: true, cellNF: true })`. `TextDecoder` strips the UTF-8 BOM. Other formats keep `type: "array"`.
     - `readSheet = (data: ArrayBuffer, fileName: string): Sheet`: `read(data, { type: "array", raw: true, cellNF: true })` (or the decoded text above for `.csv`) (`raw: true` keeps `"-3,7319"` as a string in CSV; without it SheetJS returns `-37319`. `cellNF: true` keeps each cell's number format `z` so dates/currency survive the export). Use `SheetNames[0]` only. Throw `Error("Não foi possível ler o arquivo.")` when parsing fails or there is no sheet, and `Error("O arquivo está vazio.")` when `!ref` is missing or every row is empty.
     - Rows via `utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: null, range })`, with `range` = `decode_range(ws["!ref"])` and its start forced to `A1`, so `rawRows[i]` is sheet row `i + 1` even when the data starts at `B3` (needed for export).
     - `headerRowIndex` = `getFirstNonEmptyRowIndex(rawRows)`; `sheetName` = `SheetNames[0]`; `worksheet` = that worksheet object.
     - `getColumnLabels = (headers: string[]): string[]`: empty → `Coluna ${encode_col(i)}`; duplicates → `${header} (${encode_col(i)})`; unique → header.
   - Done when: step 8 sheet tests pass.

4. Extend `src/components/planner-provider.tsx`
   - Details: add `clients: Client[]` and `invalidRowIndexes: number[]` to the context, computed with `useMemo` from `clientRows` + `state.columnMapping` (empty arrays when no mapping).
   - Done when: `usePlanner()` exposes both values and `tsc` passes.

5. Create `src/components/header-row-dialog.tsx` (new)
   - Details: props `open`, `onOpenChange`. Local `selectedIndex`, reset to `state.sheet.headerRowIndex` each time it opens. Renders `Dialog` (`sm:max-w-3xl`) with a `Table` of `getPreviewRows(rawRows)`: first column is the row number (`rowIndex + 1`), other cells are truncated (`max-w-40 truncate`). Row click sets `selectedIndex`; the row has `tabIndex={0}`, `aria-selected`, and Enter/Space handling; the selected row is highlighted (`data-state="selected"`). "Confirmar" dispatches `setHeaderRow` only when the index changed (so confirming the same row keeps the column mapping), then closes.
   - Done when: picking row 3 and confirming makes the selects list row 3's cells.

6. Create `src/components/column-mapping.tsx` (new)
   - Details: two `Label` + `Select` ("Latitude", "Longitude"). Items come from `getColumnLabels(headers)`, value = column index; pass `items` to `Select` so the trigger shows the label. Local partial state is initialized from `state.columnMapping`; the parent renders it with `key={headerRowIndex}` so a header change resets it. Dispatch `setColumnMapping` only when both are set. The column picked in one select is `disabled` in the other.
   - Done when: choosing both columns sets `state.columnMapping`; changing either one dispatches again.

7. Create `src/components/sheet-import.tsx` (new) and render it in `src/components/app-sidebar.tsx`
   - Details:
     - `SidebarGroup` with an upload `Button` (`FileSpreadsheet`/`Upload` icon + "Importar planilha") that clicks a hidden `<input type="file" accept=".xlsx,.xls,.csv">`, plus a hint "Formatos: .xlsx, .xls, .csv".
     - `onChange`: `readSheet(await file.arrayBuffer(), file.name)` in try/catch. Error → set `error`, state untouched. Success → clear `error`; if `state.sheet` exists, store it as `pendingSheet` (opens the `AlertDialog`), else dispatch `loadSheet` and open the header dialog. Always reset `input.value` so picking the same file again fires `change`.
     - `AlertDialog`: confirm → `loadSheet(pendingSheet)`, clear pending, open the header dialog; cancel → clear pending.
     - `Alert variant="destructive"` with the error message.
     - When a sheet is loaded: file name, "Alterar cabeçalho" button (opens `HeaderRowDialog`), and `<ColumnMapping key={headerRowIndex} />`.
     - `app-sidebar.tsx`: render `<SheetImport />` inside `SidebarContent`.
   - Done when: the manual checks under Verification pass.

8. Tests in `src/lib/planner.test.ts` and `src/lib/sheet.test.ts` (new)
   - Done when: `npm run test` passes with the cases listed under Tests.

## Tests
- `planner.test.ts` → `parseCoordinate`: `"-3,7319"` → `-3.7319`; `" 12.5 "` → `12.5`; numeric `-38.5` → `-38.5`; `""`, `"   "`, `null`, `undefined` → `null`; `"abc"` → `null`; `90`/`-90` valid and `90.0001` invalid for limit 90; `180` valid and `-180.1` invalid for limit 180.
- `planner.test.ts` → `getClients`: valid rows become `Client`s with the right `rowIndex`; rows with an invalid lat or lng go to `invalidRowIndexes`.
- `planner.test.ts` → `getClientRows`: header on row index 2 excludes rows 0–2; fully empty rows below the header (`[]`, `[null, ""]`, `["  "]`) are skipped and not counted as invalid.
- `planner.test.ts` → `getFirstNonEmptyRowIndex` and `getPreviewRows`: skip leading empty rows, keep original indexes, respect the limit.
- `sheet.test.ts` → `readSheet` with buffers built by SheetJS `write`: only the first of two sheets is read; quoted CSV `"-3,7319"` stays the string `"-3,7319"`; a `;`-separated CSV (`nome;lat;lng` / `A;-3,7319;-38,5267`) splits into 3 columns with the comma kept; a date cell keeps its `z` format; a sheet starting at `B3` keeps rows/columns aligned to `A1`; a UTF-8 CSV without BOM keeps `"Região"`; a Windows-1252 CSV keeps `"Região"`; a UTF-8 CSV with BOM has no BOM in the first cell; an empty file throws `"O arquivo está vazio."`; a truncated `.xlsx` (`PK\x03\x04` + a few bytes) throws `"Não foi possível ler o arquivo."` (random bytes do not throw: SheetJS reads them as a one-cell CSV).
- Test imports are relative (`./planner`, `./sheet`): there is no `vitest.config.*`, so the `@/` alias does not resolve in tests.
- `sheet.test.ts` → `getColumnLabels`: empty → `Coluna C`; duplicates → `Lat (C)`/`Lat (F)`.

## Verification
- `npm run test` (repo root): all tests pass.
- `npm run lint` (repo root): no errors.
- `npx tsc --noEmit` (repo root): no errors.
- Dev server (`preview_start` `dev`), manual:
  - `.xlsx` with title rows above the header on row 4 → dialog pre-selects the first non-empty row; picking row 4 and confirming makes the selects list its headers.
  - UTF-8 `.csv` with accented headers → selects show them correctly.
  - CSV with `"-3,7319"` → after mapping, `clients` has `lat: -3.7319` (checked via React state/logging during dev, no UI for counts until task 09).
  - Second upload → `AlertDialog`; cancel keeps the file name and mapping; confirm replaces them.
  - Empty file → destructive `Alert`; previous data kept.

## Risks
- Biome a11y rules on a clickable `<tr>`: keyboard handlers and `tabIndex`/`aria-selected` are planned; `npm run lint` confirms.
- `raw: true` also leaves CSV numbers as strings: harmless, `parseCoordinate` converts via `String` + `Number`. The export then writes them as text cells (see task 08 plan).
- Encoding fallback: a non-UTF-8 CSV in an encoding other than Windows-1252 still garbles accents; Windows-1252 covers Excel-saved CSVs in pt-BR.
- `.xls` files with odd ranges: forcing the range start to `A1` keeps indexes stable; covered by the `B3` test.
