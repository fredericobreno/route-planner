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
    expect(parseCoordinate("-3,7319", "lat")).toBe(-3.7319);
  });

  it("trims surrounding spaces", () => {
    expect(parseCoordinate(" 12.5 ", "lat")).toBe(12.5);
  });

  it("accepts numeric values", () => {
    expect(parseCoordinate(-38.5, "lng")).toBe(-38.5);
  });

  it.each([
    "",
    "   ",
    null,
    undefined,
  ])("returns null for empty %j", (value) => {
    expect(parseCoordinate(value, "lat")).toBeNull();
  });

  it("returns null for non-numeric values", () => {
    expect(parseCoordinate("abc", "lat")).toBeNull();
  });

  it("applies the latitude limit", () => {
    expect(parseCoordinate(90, "lat")).toBe(90);
    expect(parseCoordinate(-90, "lat")).toBe(-90);
    expect(parseCoordinate(90.0001, "lat")).toBeNull();
  });

  it("applies the longitude limit", () => {
    expect(parseCoordinate(180, "lng")).toBe(180);
    expect(parseCoordinate(-180.1, "lng")).toBeNull();
  });

  it("restores the decimal point from thousand-separated text", () => {
    expect(parseCoordinate("-3.731.912", "lat")).toBe(-3.731912);
    expect(parseCoordinate("-38.523.456", "lng")).toBe(-38.523456);
    expect(parseCoordinate("-23.550.520", "lat")).toBe(-23.55052);
  });

  it("restores the decimal point from numbers that lost it", () => {
    expect(parseCoordinate(-3731912, "lat")).toBe(-3.731912);
    expect(parseCoordinate(-385234567, "lng")).toBe(-38.5234567);
    expect(parseCoordinate(2345678, "lat")).toBe(2.345678);
  });

  it("returns null when no decimal point falls inside Brazil", () => {
    expect(parseCoordinate(95, "lat")).toBeNull();
    expect(parseCoordinate(-200, "lng")).toBeNull();
    expect(parseCoordinate("38.523.456", "lng")).toBeNull();
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

describe("plannerReducer updateCells", () => {
  const buildEditableSheet = (): Sheet => ({
    ...buildSheet(
      [
        ["nome", "lat", "lng"],
        ["A", "-3,7", "-38,5"],
        ["B", "-3,8", "-38,6"],
      ],
      0,
    ),
    worksheet: {
      A2: { t: "s", v: "A" },
      B2: { t: "s", v: "-3,7" },
      C2: { t: "s", v: "-38,5" },
    },
  });

  const loaded = plannerReducer(
    plannerReducer(createInitialState(), {
      type: "loadSheet",
      sheet: buildEditableSheet(),
    }),
    { type: "setColumnMapping", mapping: { latColumn: 1, lngColumn: 2 } },
  );

  it("updates rawRows and worksheet", () => {
    const state = plannerReducer(loaded, {
      type: "updateCells",
      rowIndex: 1,
      cells: new Map([
        [0, { t: "s", v: "Ana" }],
        [1, { t: "n", v: -3.75 }],
      ]),
    });

    expect(state.sheet?.rawRows[1]).toEqual(["Ana", -3.75, "-38,5"]);
    expect(state.sheet?.rawRows[2]).toBe(loaded.sheet?.rawRows[2]);
    expect(state.sheet?.worksheet.A2).toEqual({ t: "s", v: "Ana" });
    expect(state.sheet?.worksheet.B2).toEqual({ t: "n", v: -3.75 });
    expect(
      getClients(getClientRows(state.sheet as Sheet), {
        latColumn: 1,
        lngColumn: 2,
      }).clients[0],
    ).toEqual({ rowIndex: 1, lat: -3.75, lng: -38.5 });
  });

  it("clears a cell set to null", () => {
    const state = plannerReducer(loaded, {
      type: "updateCells",
      rowIndex: 1,
      cells: new Map([[0, null]]),
    });

    expect(state.sheet?.rawRows[1]).toEqual([null, "-3,7", "-38,5"]);
    expect(state.sheet?.worksheet.A2).toBeUndefined();
  });

  it("fills skipped columns with null", () => {
    const state = plannerReducer(loaded, {
      type: "updateCells",
      rowIndex: 1,
      cells: new Map([[4, { t: "s", v: "extra" }]]),
    });

    expect(state.sheet?.rawRows[1]).toEqual([
      "A",
      "-3,7",
      "-38,5",
      null,
      "extra",
    ]);
  });

  it("leaves the previous sheet untouched", () => {
    plannerReducer(loaded, {
      type: "updateCells",
      rowIndex: 1,
      cells: new Map([[0, { t: "s", v: "Ana" }]]),
    });

    expect(loaded.sheet?.rawRows[1][0]).toBe("A");
    expect(loaded.sheet?.worksheet.A2.v).toBe("A");
  });

  it("keeps regions, editing and column mapping", () => {
    const grouped = {
      ...plannerReducer(loaded, {
        type: "setGroups",
        assignments: new Map([[1, 1]]),
      }),
      editingRegion: 1,
    };

    const state = plannerReducer(grouped, {
      type: "updateCells",
      rowIndex: 1,
      cells: new Map([[0, { t: "s", v: "Ana" }]]),
    });

    expect(state.assignments).toEqual(new Map([[1, 1]]));
    expect(state.editingRegion).toBe(1);
    expect(state.columnMapping).toEqual({ latColumn: 1, lngColumn: 2 });
  });

  it("ignores updates without a sheet", () => {
    const state = createInitialState();

    expect(
      plannerReducer(state, {
        type: "updateCells",
        rowIndex: 1,
        cells: new Map([[0, null]]),
      }),
    ).toBe(state);
  });
});
