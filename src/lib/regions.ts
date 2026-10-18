import convex from "@turf/convex";
import { featureCollection, point } from "@turf/helpers";
import type { LatLngTuple } from "leaflet";
import type { Client } from "./planner";

export type RegionShape = { region: number; color: string } & (
  | { kind: "polygon"; positions: LatLngTuple[] }
  | { kind: "line"; positions: [LatLngTuple, LatLngTuple] }
  | { kind: "point"; position: LatLngTuple }
);

export const getRegionColor = (region: number) =>
  `hsl(${(region * 137.508) % 360} 70% 45%)`;

export const getRegionLabel = (region: number) => `Região ${region}`;

const isCollinear = (points: LatLngTuple[]) => {
  const [[lat0, lng0], [lat1, lng1]] = points;
  return points.every(
    ([lat, lng]) =>
      Math.abs((lng1 - lng0) * (lat - lat0) - (lat1 - lat0) * (lng - lng0)) <
      1e-12,
  );
};

const getShape = (region: number, positions: LatLngTuple[]): RegionShape => {
  const color = getRegionColor(region);
  const unique = [
    ...new Map(
      positions.map((position) => [position.join(","), position]),
    ).values(),
  ];

  if (unique.length === 1) {
    return { region, color, kind: "point", position: unique[0] };
  }
  if (isCollinear(unique)) {
    const sorted = unique.toSorted((a, b) => a[1] - b[1] || a[0] - b[0]);
    return {
      region,
      color,
      kind: "line",
      positions: [sorted[0], sorted[sorted.length - 1]],
    };
  }

  const hull = convex(
    featureCollection(unique.map(([lat, lng]) => point([lng, lat]))),
  );
  if (!hull) throw new Error(`Convex hull failed for region ${region}`);
  return {
    region,
    color,
    kind: "polygon",
    positions: hull.geometry.coordinates[0].map(
      ([lng, lat]): LatLngTuple => [lat, lng],
    ),
  };
};

export const getRegionShapes = (
  clients: Client[],
  assignments: Map<number, number>,
): RegionShape[] => {
  const positionsByRegion = new Map<number, LatLngTuple[]>();
  for (const { rowIndex, lat, lng } of clients) {
    const region = assignments.get(rowIndex);
    if (region === undefined) continue;
    const positions = positionsByRegion.get(region) ?? [];
    positions.push([lat, lng]);
    positionsByRegion.set(region, positions);
  }
  return [...positionsByRegion]
    .sort(([a], [b]) => a - b)
    .map(([region, positions]) => getShape(region, positions));
};
