import { type CellObject, utils, type WorkSheet } from "xlsx";

export type Sheet = {
  fileName: string;
  sheetName: string;
  worksheet: WorkSheet;
  rawRows: unknown[][];
  headerRowIndex: number | null;
};

export type ColumnMapping = {
  latColumn: number;
  lngColumn: number;
};

export type Client = {
  rowIndex: number;
  lat: number;
  lng: number;
};

export type ClientRow = {
  rowIndex: number;
  cells: unknown[];
};

// Column index → new cell; `null` clears the cell.
export type CellUpdates = Map<number, CellObject | null>;

export type PlannerState = {
  sheet: Sheet | null;
  columnMapping: ColumnMapping | null;
  assignments: Map<number, number>;
  editingRegion: number | null;
  tooltipColumns: number[];
};

export type PlannerAction =
  | { type: "loadSheet"; sheet: Sheet }
  | { type: "setHeaderRow"; index: number }
  | { type: "setColumnMapping"; mapping: ColumnMapping }
  | { type: "setTooltipColumns"; columns: number[] }
  | { type: "reset" }
  | { type: "setGroups"; assignments: Map<number, number> }
  | { type: "togglePoint"; rowIndex: number }
  | { type: "createRegion"; rowIndex: number }
  | { type: "startEditing"; region: number }
  | { type: "stopEditing" }
  | { type: "updateCells"; rowIndex: number; cells: CellUpdates };

export const createInitialState = (): PlannerState => ({
  sheet: null,
  columnMapping: null,
  assignments: new Map(),
  editingRegion: null,
  tooltipColumns: [],
});

export const plannerReducer = (
  state: PlannerState,
  action: PlannerAction,
): PlannerState => {
  switch (action.type) {
    case "loadSheet":
      return { ...createInitialState(), sheet: action.sheet };
    case "setHeaderRow":
      if (!state.sheet) return state;
      return {
        ...state,
        sheet: { ...state.sheet, headerRowIndex: action.index },
        columnMapping: null,
        assignments: new Map(),
        editingRegion: null,
        tooltipColumns: [],
      };
    case "setColumnMapping":
      if (!state.sheet) return state;
      return {
        ...state,
        columnMapping: action.mapping,
        assignments: new Map(),
        editingRegion: null,
      };
    case "setTooltipColumns":
      if (!state.sheet) return state;
      return { ...state, tooltipColumns: action.columns };
    case "reset":
      return createInitialState();
    case "setGroups":
      return {
        ...state,
        assignments: new Map(action.assignments),
        editingRegion: null,
      };
    case "togglePoint":
      if (state.editingRegion === null) return state;
      return {
        ...state,
        ...togglePointAssignment(
          state.assignments,
          action.rowIndex,
          state.editingRegion,
        ),
      };
    case "createRegion": {
      if (
        state.editingRegion !== null ||
        state.assignments.has(action.rowIndex)
      ) {
        return state;
      }
      const region = Math.max(0, ...state.assignments.values()) + 1;
      return {
        ...state,
        assignments: new Map(state.assignments).set(action.rowIndex, region),
        editingRegion: region,
      };
    }
    case "startEditing":
      return { ...state, editingRegion: action.region };
    case "stopEditing":
      return { ...state, editingRegion: null };
    case "updateCells":
      if (!state.sheet) return state;
      return {
        ...state,
        sheet: updateSheetCells(state.sheet, action.rowIndex, action.cells),
      };
  }
};

// Writes to both `worksheet` (tooltips, export) and `rawRows` (points) so
// they stay in sync; the previous sheet is left untouched.
export const updateSheetCells = (
  sheet: Sheet,
  rowIndex: number,
  cells: CellUpdates,
): Sheet => {
  const worksheet: WorkSheet = { ...sheet.worksheet };
  const row = [...(sheet.rawRows[rowIndex] ?? [])];
  for (const [column, cell] of cells) {
    const address = utils.encode_cell({ r: rowIndex, c: column });
    if (cell) {
      worksheet[address] = cell;
    } else {
      delete worksheet[address];
    }
    row[column] = cell?.v ?? null;
  }
  return {
    ...sheet,
    worksheet,
    rawRows: sheet.rawRows.map((cells, i) =>
      i === rowIndex ? Array.from(row, (cell) => cell ?? null) : cells,
    ),
  };
};

const isEmptyCell = (cell: unknown) =>
  cell === null || cell === undefined || String(cell).trim() === "";

export const isEmptyRow = (cells: unknown[]) =>
  Array.from(cells).every(isEmptyCell);

export const getFirstNonEmptyRowIndex = (rows: unknown[][]): number | null => {
  const index = rows.findIndex((cells) => !isEmptyRow(cells));
  return index === -1 ? null : index;
};

export const getPreviewRows = (rows: unknown[][], limit = 10): ClientRow[] =>
  rows
    .map((cells, rowIndex) => ({ rowIndex, cells }))
    .filter(({ cells }) => !isEmptyRow(cells))
    .slice(0, limit);

// `min`/`max` are Brazil's bounding box, used only to restore a lost decimal point.
const COORDINATE_BOUNDS = {
  lat: { limit: 90, min: -33.8, max: 5.3 },
  lng: { limit: 180, min: -74, max: -34.8 },
};

type CoordinateAxis = keyof typeof COORDINATE_BOUNDS;

// A number-formatted column turns "-3.731912" into -3731912 (shown as
// "-3.731.912"), so the digits are kept and the point is placed where the
// value falls inside Brazil, preferring two integer digits when both fit.
const restoreDecimalPoint = (
  text: string,
  { min, max }: { min: number; max: number },
): number | null => {
  const digits = text.replace(/\D/g, "");
  const sign = text.startsWith("-") ? -1 : 1;
  for (const integerDigits of [2, 1]) {
    const number =
      sign *
      Number(
        `${digits.slice(0, integerDigits)}.${digits.slice(integerDigits)}`,
      );
    if (number >= min && number <= max) return number;
  }
  return null;
};

export const parseCoordinate = (
  value: unknown,
  axis: CoordinateAxis,
): number | null => {
  if (isEmptyCell(value)) return null;
  const bounds = COORDINATE_BOUNDS[axis];
  const text = String(value).trim();
  const number = Number(text.replace(",", "."));
  if (
    !Number.isFinite(number) ||
    number < -bounds.limit ||
    number > bounds.limit
  ) {
    return restoreDecimalPoint(text, bounds);
  }
  return number;
};

export const getClients = (
  rows: ClientRow[],
  mapping: ColumnMapping,
): { clients: Client[]; invalidRowIndexes: number[] } => {
  const clients: Client[] = [];
  const invalidRowIndexes: number[] = [];
  for (const { rowIndex, cells } of rows) {
    const lat = parseCoordinate(cells[mapping.latColumn], "lat");
    const lng = parseCoordinate(cells[mapping.lngColumn], "lng");
    if (lat === null || lng === null) {
      invalidRowIndexes.push(rowIndex);
    } else {
      clients.push({ rowIndex, lat, lng });
    }
  }
  return { clients, invalidRowIndexes };
};

export const getHeaders = (sheet: Sheet): string[] => {
  if (sheet.headerRowIndex === null) return [];
  const headerRow = sheet.rawRows[sheet.headerRowIndex] ?? [];
  return Array.from(headerRow, (cell) => String(cell ?? "").trim());
};

export const getClientRows = (sheet: Sheet): ClientRow[] => {
  if (sheet.headerRowIndex === null) return [];
  return sheet.rawRows
    .map((cells, rowIndex) => ({ rowIndex, cells }))
    .slice(sheet.headerRowIndex + 1)
    .filter(({ cells }) => !isEmptyRow(cells));
};

export const renumberRegions = (
  assignments: Map<number, number>,
): Map<number, number> => {
  const regions = [...new Set(assignments.values())].sort((a, b) => a - b);
  const newNumbers = new Map(regions.map((region, i) => [region, i + 1]));
  return new Map(
    [...assignments].map(([rowIndex, region]) => [
      rowIndex,
      newNumbers.get(region) ?? region,
    ]),
  );
};

export const togglePointAssignment = (
  assignments: Map<number, number>,
  rowIndex: number,
  editingRegion: number,
): { assignments: Map<number, number>; editingRegion: number | null } => {
  const next = new Map(assignments);
  if (next.get(rowIndex) === editingRegion) {
    next.delete(rowIndex);
  } else {
    next.set(rowIndex, editingRegion);
  }

  // Any row still in the edited region tells its number after renumbering.
  const memberRowIndex = [...next].find(
    ([, region]) => region === editingRegion,
  )?.[0];
  const renumbered = renumberRegions(next);
  return {
    assignments: renumbered,
    editingRegion:
      memberRowIndex === undefined
        ? null
        : (renumbered.get(memberRowIndex) ?? null),
  };
};

export const getSummary = (
  clients: Client[],
  assignments: Map<number, number>,
): { regions: { region: number; count: number }[]; unassigned: number } => {
  const counts = new Map<number, number>();
  let unassigned = 0;
  for (const { rowIndex } of clients) {
    const region = assignments.get(rowIndex);
    if (region === undefined) {
      unassigned++;
    } else {
      counts.set(region, (counts.get(region) ?? 0) + 1);
    }
  }
  return {
    regions: [...counts]
      .sort(([a], [b]) => a - b)
      .map(([region, count]) => ({ region, count })),
    unassigned,
  };
};
