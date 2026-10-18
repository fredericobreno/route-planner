import type { WorkSheet } from "xlsx";

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

export type PlannerState = {
  sheet: Sheet | null;
  columnMapping: ColumnMapping | null;
  assignments: Map<number, number>;
  editingRegion: number | null;
};

export type PlannerAction =
  | { type: "loadSheet"; sheet: Sheet }
  | { type: "setHeaderRow"; index: number }
  | { type: "setColumnMapping"; mapping: ColumnMapping }
  | { type: "reset" }
  | { type: "setGroups"; assignments: Map<number, number> }
  | { type: "togglePoint"; rowIndex: number }
  | { type: "startEditing"; region: number }
  | { type: "stopEditing" };

export const createInitialState = (): PlannerState => ({
  sheet: null,
  columnMapping: null,
  assignments: new Map(),
  editingRegion: null,
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
      };
    case "setColumnMapping":
      if (!state.sheet) return state;
      return {
        ...state,
        columnMapping: action.mapping,
        assignments: new Map(),
        editingRegion: null,
      };
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
    case "startEditing":
      return { ...state, editingRegion: action.region };
    case "stopEditing":
      return { ...state, editingRegion: null };
  }
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

export const parseCoordinate = (
  value: unknown,
  limit: number,
): number | null => {
  if (isEmptyCell(value)) return null;
  const number = Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(number) || number < -limit || number > limit) {
    return null;
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
    const lat = parseCoordinate(cells[mapping.latColumn], 90);
    const lng = parseCoordinate(cells[mapping.lngColumn], 180);
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
