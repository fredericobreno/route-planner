import type { Client } from "./planner";

const MAX_ITERATIONS = 10;

const squaredDistance = (
  xs: Float64Array,
  ys: Float64Array,
  i: number,
  cx: Float64Array,
  cy: Float64Array,
  c: number,
) => {
  const dx = xs[i] - cx[c];
  const dy = ys[i] - cy[c];
  return dx * dx + dy * dy;
};

const pickInitialCentroids = (
  xs: Float64Array,
  ys: Float64Array,
  k: number,
  random: () => number,
) => {
  const n = xs.length;
  const cx = new Float64Array(k);
  const cy = new Float64Array(k);
  const used = new Uint8Array(n);
  const minDistances = new Float64Array(n);

  const place = (c: number, i: number) => {
    used[i] = 1;
    cx[c] = xs[i];
    cy[c] = ys[i];
    for (let j = 0; j < n; j++) {
      const distance = squaredDistance(xs, ys, j, cx, cy, c);
      if (c === 0 || distance < minDistances[j]) minDistances[j] = distance;
    }
  };

  place(0, Math.floor(random() * n));
  for (let c = 1; c < k; c++) {
    let total = 0;
    for (let j = 0; j < n; j++) total += minDistances[j];

    let picked = -1;
    if (total > 0) {
      let target = random() * total;
      for (let j = 0; j < n; j++) {
        if (minDistances[j] === 0) continue;
        picked = j;
        target -= minDistances[j];
        if (target < 0) break;
      }
    } else {
      // Every remaining client shares a centroid's coordinates (duplicates).
      const unused: number[] = [];
      for (let j = 0; j < n; j++) if (!used[j]) unused.push(j);
      picked = unused[Math.floor(random() * unused.length)];
    }
    place(c, picked);
  }

  return { cx, cy };
};

export const groupClients = (
  clients: Client[],
  size: number,
  random: () => number = Math.random,
): Map<number, number> => {
  const n = clients.length;
  if (n === 0) return new Map();
  if (size >= n) return new Map(clients.map(({ rowIndex }) => [rowIndex, 1]));
  if (size === 1) {
    return new Map(clients.map(({ rowIndex }, i) => [rowIndex, i + 1]));
  }

  // Equirectangular projection keeps distances comparable at any latitude.
  const meanLat = clients.reduce((sum, { lat }) => sum + lat, 0) / n;
  const scale = Math.cos((meanLat * Math.PI) / 180);
  const xs = Float64Array.from(clients, ({ lng }) => lng * scale);
  const ys = Float64Array.from(clients, ({ lat }) => lat);

  const k = Math.ceil(n / size);
  const capacities = new Int32Array(k).fill(size);
  capacities[k - 1] = n - (k - 1) * size;

  const { cx, cy } = pickInitialCentroids(xs, ys, k, random);
  const assignment = new Int32Array(n).fill(-1);
  const nearest = new Float64Array(n);
  const order = Array.from({ length: n }, (_, i) => i);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    for (let i = 0; i < n; i++) {
      let best = Number.POSITIVE_INFINITY;
      for (let c = 0; c < k; c++) {
        const distance = squaredDistance(xs, ys, i, cx, cy, c);
        if (distance < best) best = distance;
      }
      nearest[i] = best;
    }
    order.sort((a, b) => nearest[a] - nearest[b]);

    const remaining = capacities.slice();
    let changed = false;
    for (const i of order) {
      let bestCentroid = -1;
      let best = Number.POSITIVE_INFINITY;
      for (let c = 0; c < k; c++) {
        if (remaining[c] === 0) continue;
        const distance = squaredDistance(xs, ys, i, cx, cy, c);
        if (distance < best) {
          best = distance;
          bestCentroid = c;
        }
      }
      remaining[bestCentroid]--;
      if (assignment[i] !== bestCentroid) {
        assignment[i] = bestCentroid;
        changed = true;
      }
    }
    if (!changed) break;

    cx.fill(0);
    cy.fill(0);
    for (let i = 0; i < n; i++) {
      cx[assignment[i]] += xs[i];
      cy[assignment[i]] += ys[i];
    }
    for (let c = 0; c < k; c++) {
      cx[c] /= capacities[c];
      cy[c] /= capacities[c];
    }
  }

  return new Map(
    clients.map(({ rowIndex }, i) => [rowIndex, assignment[i] + 1]),
  );
};
