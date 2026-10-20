# Export (task 08)

## Goal
Download an `.xlsx` with the original first sheet plus a `Região` column filled from the current assignments.

## Acceptance criteria
- [ ] The file has all original rows and columns in the same order.
- [ ] `Região` column matches the current regions (including edits).
- [ ] Exporting before generating groups → `Região` column fully empty.
- [ ] An existing `Região` column is overwritten, not duplicated.
- [ ] File name `<original-name>-regioes.xlsx`.
- [ ] Vitest unit tests for the sheet build (new column, overwrite, empty values, file name).
- [ ] `npm run test`, `npm run lint` and `npx tsc --noEmit` pass.

## Decisions
- Source: the original worksheet kept in `Sheet.worksheet` (task 03 plan, read with `cellNF: true`) is shallow-copied and only the `Região` column is written. This keeps number/date formats and the original sheet name, which `aoa_to_sheet(rawRows)` would lose.
- Existing column match: header cell `trim`, lower-cased, accents stripped (`normalize("NFD")` + remove `/[\u0300-\u036f]/g`; `\p{Diacritic}` needs ES2018 and `tsconfig.json` targets ES2017) equals `"regiao"`. The first match wins.
- New column index: `decode_range(ws["!ref"]).e.c + 1`, the first column after the widest row.
- Rows above the header: untouched. With a new column they are empty by definition; with an overwritten column their original content is kept, since they are not client rows.
- Rows from the header + 1 down to the last row: `Região N` when the row is in `assignments`, otherwise the cell is deleted (empty). This covers invalid, unassigned, and fully empty rows.
- The summary needs no export-specific state: it is derived and always visible while a sheet is loaded (task 09 plan).

## Out of scope
- Summary UI (task 09).
- Writing formats other than `.xlsx`.

## Reuse
- `src/lib/sheet.ts` (task 03): SheetJS helpers; export helpers go in the same file.
- `src/lib/regions.ts` (task 06): `getRegionLabel` for `Região N`.
- `src/lib/planner.ts:24`: `assignments` and `sheet.headerRowIndex`.
- SheetJS `utils.encode_cell`, `decode_range`, `encode_range`, `book_new`, `book_append_sheet`, `writeFile`.

## Steps
1. Add export helpers to `src/lib/sheet.ts`
   - Details:
     - `export const getExportFileName = (fileName: string) => \`${fileName.replace(/\.[^.]+$/, "")}-regioes.xlsx\``.
     - `const isRegionHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "regiao"`.
     - `export const buildExportWorksheet = (sheet: Sheet, assignments: Map<number, number>): WorkSheet`:
       - `const ws = { ...sheet.worksheet }`; header row `h = sheet.headerRowIndex`; `h === null` → return `ws` unchanged (unreachable in practice: `readSheet` always sets it, but the type is nullable); `range = decode_range(ws["!ref"])`.
       - Column `c` = first index in `sheet.rawRows[h]` where `isRegionHeader`, else `range.e.c + 1`.
       - `ws[encode_cell({ r: h, c })] = { t: "s", v: "Região" }`.
       - For `r` from `h + 1` to `range.e.r`: region → `{ t: "s", v: getRegionLabel(region) }`, else `delete ws[address]`.
       - Update `!ref` with `e.c = max(e.c, c)`; return `ws`.
     - `export const exportSheet = (sheet: Sheet, assignments: Map<number, number>) => { const wb = utils.book_new(); utils.book_append_sheet(wb, buildExportWorksheet(sheet, assignments), sheet.sheetName); writeFile(wb, getExportFileName(sheet.fileName), { bookType: "xlsx" }); }`.
   - Done when: step 3 tests pass.

2. Create `src/components/export-button.tsx` (new) and render it in a `SidebarFooter` in `src/components/app-sidebar.tsx`
   - Why new: the button needs `usePlanner()` (client component); `app-sidebar.tsx` stays a plain composition of components, like it is today.
   - Details: full-width `Button` (`Download` icon + "Exportar"), disabled when `state.sheet === null`; click → `exportSheet(state.sheet, state.assignments)` in try/catch; on error show an `Alert` destructive "Não foi possível exportar o arquivo." below the button (local state, cleared on the next successful export).
   - Done when: clicking downloads `<name>-regioes.xlsx` right after import.

3. Create tests in `src/lib/sheet.test.ts` (file from task 03)
   - Done when: `npm run test` passes with the cases under Tests.

## Tests
- `getExportFileName`: `"clientes.xlsx"` → `"clientes-regioes.xlsx"`; `"base.v2.csv"` → `"base.v2-regioes.xlsx"`; `"semextensao"` → `"semextensao-regioes.xlsx"`.
- `buildExportWorksheet` (sheet built with `aoa_to_sheet` + header on row index 2):
  - New column: `Região` header at row 2, column after the last; assigned rows get `Região N`; unassigned/invalid rows have no cell; rows 0–1 untouched; `!ref` widened by one column.
  - Overwrite: header `" REGIAO "` at column 1 → that column is reused, no extra column; old values below the header replaced or removed.
  - No assignments → every row below the header empty in the `Região` column.
  - Original columns and cell values unchanged; a cell with `z: "dd/mm/yyyy"` keeps `z`.
  - `sheet.worksheet` is not mutated.
  - `headerRowIndex: null` → worksheet returned unchanged.
- Round trip: `write(book, { type: "array", bookType: "xlsx" })` → `read` → `sheet_to_json(header: 1)` equals the expected rows.

## Verification
- `npm run test`, `npm run lint`, `npx tsc --noEmit`: pass.
- Dev server, manual:
  - Import → "Exportar" enabled immediately → downloaded file has an empty `Região` column and every original row, including title rows above the header.
  - Generate groups, edit a region, export → values match the map.
  - Import a file with an existing `Região` column → exported file has one `Região` column.
  - Import a `.csv` → exported file is `.xlsx`.

## Risks
- SheetJS Community Edition does not write cell styles (fonts, fills): only values, number formats, and sheet structure survive. Accepted; formats are what matters for data.
- CSV imports are read with `raw: true` (task 03 plan), so every cell is a string and numbers are exported as text cells. Accepted: it keeps leading zeros (CEP, codes) and coordinates as typed.
- `{ ...ws }` is a shallow copy: cell objects are shared, but the export only replaces or deletes cells in the `Região` column, never mutates a cell object.
- A sheet with merged cells over the new column: `!merges` is kept as is; a merge covering the column is unlikely and left as-is.
