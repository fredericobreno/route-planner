import { describe, expect, it } from "vitest";
import type { Client } from "./planner";
import { getRegionColor, getRegionLabel, getRegionShapes } from "./regions";

const toClients = (positions: [number, number][]): Client[] =>
  positions.map(([lat, lng], rowIndex) => ({ rowIndex, lat, lng }));

const assignAll = (clients: Client[], region = 1) =>
  new Map(clients.map(({ rowIndex }) => [rowIndex, region]));

describe("getRegionShapes", () => {
  it("returns a point for 1 client", () => {
    const clients = toClients([[-3.7, -38.5]]);

    expect(getRegionShapes(clients, assignAll(clients))).toEqual([
      {
        region: 1,
        color: getRegionColor(1),
        kind: "point",
        position: [-3.7, -38.5],
      },
    ]);
  });

  it("returns a line for 2 clients", () => {
    const clients = toClients([
      [-3.7, -38.5],
      [-3.8, -38.6],
    ]);

    const [shape] = getRegionShapes(clients, assignAll(clients));

    expect(shape).toMatchObject({
      kind: "line",
      positions: [
        [-3.8, -38.6],
        [-3.7, -38.5],
      ],
    });
  });

  it("returns a line between the extremes of collinear clients", () => {
    const clients = toClients([
      [-3.75, -38.55],
      [-3.7, -38.5],
      [-3.8, -38.6],
    ]);

    const [shape] = getRegionShapes(clients, assignAll(clients));

    expect(shape).toMatchObject({
      kind: "line",
      positions: [
        [-3.8, -38.6],
        [-3.7, -38.5],
      ],
    });
  });

  it("returns a point for identical clients", () => {
    const clients = toClients([
      [-3.7, -38.5],
      [-3.7, -38.5],
      [-3.7, -38.5],
    ]);

    const [shape] = getRegionShapes(clients, assignAll(clients));

    expect(shape).toMatchObject({ kind: "point", position: [-3.7, -38.5] });
  });

  it("returns a hull polygon with only the corners", () => {
    const corners: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ];
    const clients = toClients([...corners, [0.5, 0.5]]);

    const [shape] = getRegionShapes(clients, assignAll(clients));

    expect(shape.kind).toBe("polygon");
    if (shape.kind !== "polygon") return;
    expect(shape.positions).toHaveLength(5);
    expect(shape.positions[0]).toEqual(shape.positions[4]);
    expect(
      shape.positions
        .slice(0, 4)
        .map((position) => position.join(","))
        .sort(),
    ).toEqual(corners.map((corner) => corner.join(",")).sort());
  });

  it("ignores clients without assignment", () => {
    const clients = toClients([
      [-3.7, -38.5],
      [-3.8, -38.6],
    ]);

    const shapes = getRegionShapes(clients, new Map([[0, 1]]));

    expect(shapes).toHaveLength(1);
    expect(shapes[0].kind).toBe("point");
  });

  it("sorts shapes by region", () => {
    const clients = toClients([
      [-3.7, -38.5],
      [-3.8, -38.6],
      [-3.9, -38.7],
    ]);
    const assignments = new Map([
      [0, 3],
      [1, 1],
      [2, 2],
    ]);

    expect(
      getRegionShapes(clients, assignments).map(({ region }) => region),
    ).toEqual([1, 2, 3]);
  });
});

describe("getRegionColor", () => {
  it("returns distinct colors for regions 1 to 50", () => {
    const colors = Array.from({ length: 50 }, (_, i) => getRegionColor(i + 1));

    expect(new Set(colors).size).toBe(50);
  });
});

describe("getRegionLabel", () => {
  it("formats the region number", () => {
    expect(getRegionLabel(3)).toBe("Região 3");
  });
});
