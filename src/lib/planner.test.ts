import { describe, expect, it } from "vitest";
import { renumberRegions } from "./planner";

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
