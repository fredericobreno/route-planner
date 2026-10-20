import { describe, expect, it } from "vitest";
import {
  createInitialState,
  getClientRows,
  getClients,
  getFirstNonEmptyRowIndex,
  getPreviewRows,
  getSummary,
  parseCoordinate,
  plannerReducer,
  renumberRegions,
  type Sheet,
  togglePointAssignment,
} from "./planner";

const buildSheet = (
  rawRows: unknown[][],
  headerRowIndex: number | null,
): Sheet => ({
  fileName: "clientes.xlsx",
  sheetName: "Dados",
  worksheet: {},
  rawRows,
  headerRowIndex,
});

describe("renumberRegions", () => {
  it("closes gaps keeping relative order", () => {
    const assignments = new Map([
      [10, 1],
      [11, 3],
      [12, 4],
      [13, 3],
    ]);

    expect(renumberRegions(assignments)).toEqual(
      new Map([
        [10, 1],
        [11, 2],
        [12, 3],
        [13, 2],
      ]),
    );
  });

  it("keeps sequential regions unchanged", () => {
    const assignments = new Map([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);

    expect(renumberRegions(assignments)).toEqual(assignments);
  });

  it("returns an empty map for no assignments", () => {
    expect(renumberRegions(new Map())).toEqual(new Map());
  });

  it("does not mutate the input", () => {
    const assignments = new Map([
      [0, 2],
      [1, 5],
    ]);

    renumberRegions(assignments);

    expect(assignments).toEqual(
      new Map([
        [0, 2],
        [1, 5],
      ]),
    );
  });
});

describe("parseCoordinate", () => {
  it("converts a decimal comma to a point", () => {
    expect(parseCoordinate("-3,7319", 90)).toBe(-3.7319);
  });

  it("trims surrounding spaces", () => {
    expect(parseCoordinate(" 12.5 ", 90)).toBe(12.5);
  });

  it("accepts numeric values", () => {
    expect(parseCoordinate(-38.5, 180)).toBe(-38.5);
  });

  it.each([
    "",
    "   ",
    null,
    undefined,
  ])("returns null for empty %j", (value) => {
    expect(parseCoordinate(value, 90)).toBeNull();
  });

  it("returns null for non-numeric values", () => {
    expect(parseCoordinate("abc", 90)).toBeNull();
  });

  it("applies the latitude limit", () => {
    expect(parseCoordinate(90, 90)).toBe(90);
    expect(parseCoordinate(-90, 90)).toBe(-90);
    expect(parseCoordinate(90.0001, 90)).toBeNull();
  });

  it("applies the longitude limit", () => {
    expect(parseCoordinate(180, 180)).toBe(180);
    expect(parseCoordinate(-180.1, 180)).toBeNull();
  });
});

describe("getClients", () => {
  it("splits valid clients from invalid rows", () => {
    const rows = [
      { rowIndex: 1, cells: ["A", "-3,7319", "-38,5267"] },
      { rowIndex: 2, cells: ["B", "", "-38.5"] },
      { rowIndex: 3, cells: ["C", "-3.7", "abc"] },
      { rowIndex: 4, cells: ["D", 95, -38] },
      { rowIndex: 5, cells: ["E", -3.8, -38.6] },
    ];

    expect(getClients(rows, { latColumn: 1, lngColumn: 2 })).toEqual({
      clients: [
        { rowIndex: 1, lat: -3.7319, lng: -38.5267 },
        { rowIndex: 5, lat: -3.8, lng: -38.6 },
      ],
      invalidRowIndexes: [2, 3, 4],
    });
  });
});

describe("getClientRows", () => {
  it("excludes rows up to the header", () => {
    const sheet = buildSheet(
      [["Título"], ["Sub"], ["nome", "lat"], ["A", 1], ["B", 2]],
      2,
    );

    expect(getClientRows(sheet)).toEqual([
      { rowIndex: 3, cells: ["A", 1] },
      { rowIndex: 4, cells: ["B", 2] },
    ]);
  });

  it("skips fully empty rows", () => {
    const sheet = buildSheet(
      [["nome", "lat"], ["A", 1], [], [null, ""], ["  "], ["B", 2]],
      0,
    );

    expect(getClientRows(sheet).map(({ rowIndex }) => rowIndex)).toEqual([
      1, 5,
    ]);
  });

  it("returns no rows without a header", () => {
    expect(getClientRows(buildSheet([["A"]], null))).toEqual([]);
  });
});

describe("getFirstNonEmptyRowIndex", () => {
  it("skips leading empty rows", () => {
    expect(getFirstNonEmptyRowIndex([[], [null, " "], ["nome"]])).toBe(2);
  });

  it("returns null when every row is empty", () => {
    expect(getFirstNonEmptyRowIndex([[], [null]])).toBeNull();
  });
});

describe("getPreviewRows", () => {
  it("keeps original indexes of non-empty rows", () => {
    expect(getPreviewRows([[], ["a"], [null], ["b"]])).toEqual([
      { rowIndex: 1, cells: ["a"] },
      { rowIndex: 3, cells: ["b"] },
    ]);
  });

  it("respects the limit", () => {
    const rows = Array.from({ length: 20 }, (_, i) => [i]);

    expect(getPreviewRows(rows, 10)).toHaveLength(10);
    expect(getPreviewRows(rows)).toHaveLength(10);
  });
});

describe("togglePointAssignment", () => {
  const assignments = new Map([
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 3],
  ]);

  it("removes a point of the edited region", () => {
    const result = togglePointAssignment(assignments, 2, 3);

    expect(result.assignments.has(2)).toBe(false);
    expect(result.editingRegion).toBe(3);
  });

  it("adds an unassigned point to the edited region", () => {
    const result = togglePointAssignment(assignments, 9, 3);

    expect(result.assignments.get(9)).toBe(3);
  });

  it("moves a point from another region", () => {
    const result = togglePointAssignment(assignments, 0, 2);

    expect(result.assignments.get(0)).toBe(1);
    expect(result.assignments.get(1)).toBe(1);
    expect(result.editingRegion).toBe(1);
  });

  it("removes an emptied edited region and renumbers", () => {
    const result = togglePointAssignment(assignments, 1, 2);

    expect(result.assignments).toEqual(
      new Map([
        [0, 1],
        [2, 2],
        [3, 2],
      ]),
    );
    expect(result.editingRegion).toBeNull();
  });

  it("renumbers the edited region when another region empties", () => {
    const result = togglePointAssignment(assignments, 1, 3);

    expect(result.assignments).toEqual(
      new Map([
        [0, 1],
        [1, 2],
        [2, 2],
        [3, 2],
      ]),
    );
    expect(result.editingRegion).toBe(2);
  });

  it("does not mutate the input", () => {
    const input = new Map(assignments);

    togglePointAssignment(input, 0, 3);

    expect(input).toEqual(assignments);
  });
});

describe("plannerReducer togglePoint", () => {
  it("returns the same state when not editing", () => {
    const state = {
      sheet: null,
      columnMapping: null,
      assignments: new Map([[0, 1]]),
      editingRegion: null,
      tooltipColumns: [],
    };

    expect(plannerReducer(state, { type: "togglePoint", rowIndex: 0 })).toBe(
      state,
    );
  });
});

describe("plannerReducer createRegion", () => {
  const createState = (
    assignments: Map<number, number>,
    editingRegion: number | null = null,
  ) => ({
    sheet: null,
    columnMapping: null,
    assignments,
    editingRegion,
    tooltipColumns: [],
  });

  it("creates the next region with the point and starts editing it", () => {
    const state = createState(
      new Map([
        [0, 1],
        [1, 2],
      ]),
    );

    const next = plannerReducer(state, { type: "createRegion", rowIndex: 5 });

    expect(next.assignments.get(5)).toBe(3);
    expect(next.editingRegion).toBe(3);
    expect(state.assignments.has(5)).toBe(false);
  });

  it("creates region 1 when there are no regions", () => {
    const next = plannerReducer(createState(new Map()), {
      type: "createRegion",
      rowIndex: 5,
    });

    expect(next.assignments).toEqual(new Map([[5, 1]]));
    expect(next.editingRegion).toBe(1);
  });

  it("ignores points that already have a region", () => {
    const state = createState(new Map([[0, 1]]));

    expect(plannerReducer(state, { type: "createRegion", rowIndex: 0 })).toBe(
      state,
    );
  });

  it("ignores the action while editing", () => {
    const state = createState(new Map([[0, 1]]), 1);

    expect(plannerReducer(state, { type: "createRegion", rowIndex: 5 })).toBe(
      state,
    );
  });
});

describe("getSummary", () => {
  const clients = [0, 1, 2, 3, 4].map((rowIndex) => ({
    rowIndex,
    lat: 0,
    lng: 0,
  }));

  it("counts clients per region and without region", () => {
    const summary = getSummary(
      clients,
      new Map([
        [0, 1],
        [1, 1],
        [2, 2],
      ]),
    );

    expect(summary).toEqual({
      regions: [
        { region: 1, count: 2 },
        { region: 2, count: 1 },
      ],
      unassigned: 2,
    });
    expect(
      summary.regions.reduce((sum, { count }) => sum + count, 0) +
        summary.unassigned,
    ).toBe(clients.length);
  });

  it("ignores assignments of rows that are not clients", () => {
    const summary = getSummary(
      clients,
      new Map([
        [0, 1],
        [99, 2],
      ]),
    );

    expect(summary.regions).toEqual([{ region: 1, count: 1 }]);
  });

  it("returns every client as unassigned without assignments", () => {
    expect(getSummary(clients, new Map())).toEqual({
      regions: [],
      unassigned: clients.length,
    });
  });
});

describe("plannerReducer tooltipColumns", () => {
  const loaded = plannerReducer(createInitialState(), {
    type: "loadSheet",
    sheet: buildSheet([["nome", "lat", "lng"]], 0),
  });

  it("sets the tooltip columns", () => {
    const state = plannerReducer(loaded, {
      type: "setTooltipColumns",
      columns: [0, 2],
    });

    expect(state.tooltipColumns).toEqual([0, 2]);
  });

  it("ignores tooltip columns without a sheet", () => {
    const state = createInitialState();

    expect(
      plannerReducer(state, { type: "setTooltipColumns", columns: [0] }),
    ).toBe(state);
  });

  it("clears tooltip columns when the header row changes", () => {
    const state = plannerReducer(
      plannerReducer(loaded, { type: "setTooltipColumns", columns: [0] }),
      { type: "setHeaderRow", index: 0 },
    );

    expect(state.tooltipColumns).toEqual([]);
  });

  it("keeps tooltip columns when the column mapping changes", () => {
    const state = plannerReducer(
      plannerReducer(loaded, { type: "setTooltipColumns", columns: [0] }),
      { type: "setColumnMapping", mapping: { latColumn: 1, lngColumn: 2 } },
    );

    expect(state.tooltipColumns).toEqual([0]);
  });
});
