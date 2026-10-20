# Final QA (task 10)

## Goal
Verify the app end to end against every acceptance criterion in `tasks/main.md`, with reproducible test files.

## Acceptance criteria
- [ ] All criteria in `tasks/main.md` checked.
- [ ] Tests, lint, typecheck, and build pass.

## Decisions
- Fixtures: `scripts/generate-fixtures.mjs` (new) uses SheetJS to write the files into `fixtures/`; both the script and the generated files are committed.
- Results: each verified criterion is checked (`- [x]`) in `tasks/main.md`. A failing criterion is reported to the user with the reproduction steps and stays unchecked; fixes are not part of this task.

## Out of scope
- Fixing bugs found during QA (each becomes its own change).
- E2E automation (Playwright etc.): not an approved dependency.

## Reuse
- `xlsx` (already installed) for writing `.xlsx`, `.xls` (`bookType: "biff8"`), and `.csv`.
- `.claude/launch.json`: `dev` configuration for the browser preview.
- Fixture coordinates in Fortaleza/CE (around `-3.73, -38.52`) to keep the map readable.

## Steps
1. Create `scripts/generate-fixtures.mjs` (new) and the `fixtures:generate` script in `package.json`
   - Why new: no fixture tooling exists; a script makes the files reproducible.
   - Details: `"fixtures:generate": "node scripts/generate-fixtures.mjs"`. Deterministic coordinates (seeded LCG, no `Math.random`). Files:
     - `fixtures/multi-sheet.xlsx`: sheet 1 with 20 valid clients; sheet 2 with 20 other clients far away (São Paulo) that must not appear.
     - `fixtures/legacy.xls`: 15 valid clients, `bookType: "biff8"`.
     - `fixtures/decimal-comma.csv`: `;`-separated, UTF-8 without BOM, accented headers (`Município`), lat/lng like `-3,7319`.
     - `fixtures/invalid-coordinates.xlsx`: 10 valid + rows with empty, `"abc"`, lat `95`, lng `-200`.
     - `fixtures/existing-region.xlsx`: header includes a `Região` column with old values.
     - `fixtures/title-rows.xlsx`: 2 title rows + 1 empty row above the header on row 4.
     - `fixtures/empty-rows.xlsx`: fully empty rows between clients.
     - `fixtures/103-clients.xlsx`: 103 valid clients.
     - `fixtures/5000-clients.xlsx`: 5,000 valid clients for performance checks.
     - `fixtures/empty.csv`: empty file (error path).
   - Done when: `npm run fixtures:generate` creates all files and running it twice produces byte-identical `.csv` files.

2. Exclude fixtures from lint in `biome.json`
   - Details: add `"!fixtures"` to `files.includes` (the `.csv` content would otherwise be ignored anyway via `ignoreUnknown`; the exclusion only avoids scanning large binaries).
   - Done when: `npm run lint` passes and does not list `fixtures/`.

3. Walk through every criterion in `tasks/main.md` in the browser (`preview_start` `dev`) and check it in `tasks/main.md`
   - Details: per criterion, the fixture used:
     - Upload/first sheet → `multi-sheet.xlsx`, `legacy.xls`, `decimal-comma.csv`.
     - Header choice → `title-rows.xlsx`.
     - Lat/lng selects, decimal comma → `decimal-comma.csv`.
     - Empty rows ignored → `empty-rows.xlsx` (summary count = client rows only).
     - Invalid coordinates off the map → `invalid-coordinates.xlsx` (summary shows 4 invalid).
     - Replace confirmation → upload any file twice.
     - `ceil(n / size)` groups, remainder, size > total, regenerate confirmation → `103-clients.xlsx` with size 10 and 500.
     - Hull / 1–2 point buffer → `103-clients.xlsx` size 10 (polygons), size 101 (region of 2 → line), size 51 (region of 1 → circle).
     - Editing (enter, switch, remove, add, exit ×3, renumber) → any grouped file.
     - Export enabled right after import, all rows + `Região`, overwrite, file name → `title-rows.xlsx`, `existing-region.xlsx`, re-open the downloads with SheetJS (`node -e`) to inspect rows.
     - Summary after import and export → any file.
     - Performance → `5000-clients.xlsx` (points smooth, groups < 2 s).
   - Done when: every criterion is checked or reported as failing.

4. Review the sidebar layout
   - Details: alignment and spacing between sections, disabled states (Gerar grupos, Exportar), error `Alert` for `empty.csv`, long region list scroll, dialog widths. Screenshot at the end.
   - Done when: issues are listed for the user, or none are found.

5. Run the final checks
   - Done when: `npm run test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass.

## Verification
- `npm run fixtures:generate`: creates every file listed in step 1.
- `npm run test`: pass.
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.
- `tasks/main.md`: every criterion checked, or the failing ones reported.

## Risks
- `.xls` (BIFF8) written by SheetJS may differ from files saved by real Excel: if the user has a real `.xls`, test it too.
- Browser downloads in the preview pane: if the file cannot be inspected from the pane, save it to `~/Downloads` from the pane and inspect it with `node -e` + SheetJS `readFile`.
