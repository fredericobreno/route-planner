import { describe, expect, it } from "vitest";
import { groupClients } from "./grouping";
import type { Client } from "./planner";

const createRandom = (seed = 42) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
};

const createClients = (
  count: number,
  random = createRandom(),
  box = { minLat: -4, maxLat: -3.5, minLng: -38.7, maxLng: -38.3 },
): Client[] =>
  Array.from({ length: count }, (_, i) => ({
    rowIndex: i + 1,
    lat: box.minLat + random() * (box.maxLat - box.minLat),
    lng: box.minLng + random() * (box.maxLng - box.minLng),
  }));

const getRegionSizes = (assignments: Map<number, number>) => {
  const sizes = new Map<number, number>();
  for (const region of assignments.values()) {
    sizes.set(region, (sizes.get(region) ?? 0) + 1);
  }
  return sizes;
};

describe("groupClients", () => {
  it("splits 103 clients of size 10 into 10 groups of 10 and 1 of 3", () => {
    const assignments = groupClients(createClients(103), 10, createRandom());
    const sizes = getRegionSizes(assignments);

    expect(sizes.size).toBe(11);
    expect([...sizes.values()].sort((a, b) => a - b)).toEqual([
      3, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
    ]);
    expect(sizes.get(11)).toBe(3);
  });

  it("splits 100 clients of size 10 into 10 groups of 10", () => {
    const sizes = getRegionSizes(
      groupClients(createClients(100), 10, createRandom()),
    );

    expect(sizes.size).toBe(10);
    expect([...sizes.values()].every((size) => size === 10)).toBe(true);
  });

  it("creates one group when the size is larger than the total", () => {
    const assignments = groupClients(createClients(7), 50, createRandom());

    expect(getRegionSizes(assignments)).toEqual(new Map([[1, 7]]));
  });

  it("creates one group per client with size 1", () => {
    const clients = createClients(5);
    const assignments = groupClients(clients, 1, createRandom());

    expect([...assignments.values()]).toEqual([1, 2, 3, 4, 5]);
  });

  it("assigns every input client and only those", () => {
    const clients = createClients(37);
    const assignments = groupClients(clients, 6, createRandom());

    expect([...assignments.keys()].sort((a, b) => a - b)).toEqual(
      clients.map(({ rowIndex }) => rowIndex),
    );
  });

  it("numbers regions from 1 to k", () => {
    const assignments = groupClients(createClients(37), 6, createRandom());
    const regions = [...new Set(assignments.values())].sort((a, b) => a - b);

    expect(regions).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("handles duplicate coordinates", () => {
    const clients = Array.from({ length: 20 }, (_, i) => ({
      rowIndex: i,
      lat: -3.73,
      lng: -38.52,
    }));
    const sizes = getRegionSizes(groupClients(clients, 5, createRandom()));

    expect(sizes).toEqual(
      new Map([
        [1, 5],
        [2, 5],
        [3, 5],
        [4, 5],
      ]),
    );
  });

  it("returns an empty map for no clients", () => {
    expect(groupClients([], 10)).toEqual(new Map());
  });

  it.each([10, 2])("groups 5,000 clients of size %i in under 2 s", (size) => {
    const clients = createClients(5000, createRandom(7), {
      minLat: -33,
      maxLat: 5,
      minLng: -73,
      maxLng: -35,
    });

    const start = performance.now();
    const assignments = groupClients(clients, size, createRandom());
    const elapsed = performance.now() - start;

    expect(assignments.size).toBe(5000);
    expect(elapsed).toBeLessThan(2000);
  });
});
