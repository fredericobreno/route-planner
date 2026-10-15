export type Sheet = {
  fileName: string;
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
      return state;
    case "startEditing":
      return { ...state, editingRegion: action.region };
    case "stopEditing":
      return { ...state, editingRegion: null };
  }
};

const isEmptyCell = (cell: unknown) =>
  cell === null || cell === undefined || String(cell).trim() === "";

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
    .filter(({ cells }) => !Array.from(cells).every(isEmptyCell));
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
