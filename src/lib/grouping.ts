import type { Client } from "./planner";

const MAX_ITERATIONS = 10;
const MAX_SWAP_PASSES = 20;
const SWAP_CANDIDATES = 6;

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

const recomputeCentroids = (
  xs: Float64Array,
  ys: Float64Array,
  assignment: Int32Array,
  capacities: Int32Array,
  cx: Float64Array,
  cy: Float64Array,
) => {
  cx.fill(0);
  cy.fill(0);
  for (let i = 0; i < xs.length; i++) {
    cx[assignment[i]] += xs[i];
    cy[assignment[i]] += ys[i];
  }
  for (let c = 0; c < capacities.length; c++) {
    cx[c] /= capacities[c];
    cy[c] /= capacities[c];
  }
};

// The greedy capacitated assignment pushes leftover clients into distant
// groups, so groups overlap. Swapping pairs between nearby groups keeps the
// sizes and removes those outliers.
const swapBetweenGroups = (
  xs: Float64Array,
  ys: Float64Array,
  assignment: Int32Array,
  capacities: Int32Array,
  cx: Float64Array,
  cy: Float64Array,
) => {
  const n = xs.length;
  const k = capacities.length;
  const members: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) members[assignment[i]].push(i);
  const candidates = new Int32Array(SWAP_CANDIDATES);
  const candidateDistances = new Float64Array(SWAP_CANDIDATES);

  for (let pass = 0; pass < MAX_SWAP_PASSES; pass++) {
    let swapped = false;
    for (let i = 0; i < n; i++) {
      const own = assignment[i];
      const ownDistance = squaredDistance(xs, ys, i, cx, cy, own);

      // An improving swap needs one of the two clients to prefer the other
      // group, so only groups closer than its own are worth checking.
      let count = 0;
      for (let c = 0; c < k; c++) {
        if (c === own) continue;
        const distance = squaredDistance(xs, ys, i, cx, cy, c);
        if (distance >= ownDistance) continue;
        if (
          count === SWAP_CANDIDATES &&
          distance >= candidateDistances[count - 1]
        ) {
          continue;
        }
        let position = count < SWAP_CANDIDATES ? count++ : count - 1;
        while (position > 0 && candidateDistances[position - 1] > distance) {
          candidates[position] = candidates[position - 1];
          candidateDistances[position] = candidateDistances[position - 1];
          position--;
        }
        candidates[position] = c;
        candidateDistances[position] = distance;
      }

      for (let m = 0; m < count; m++) {
        const other = candidates[m];
        const otherMembers = members[other];
        let bestGain = 0;
        let bestPosition = -1;
        for (let p = 0; p < otherMembers.length; p++) {
          const j = otherMembers[p];
          const gain =
            ownDistance +
            squaredDistance(xs, ys, j, cx, cy, other) -
            candidateDistances[m] -
            squaredDistance(xs, ys, j, cx, cy, own);
          if (gain > bestGain) {
            bestGain = gain;
            bestPosition = p;
          }
        }
        if (bestPosition === -1) continue;

        const j = otherMembers[bestPosition];
        const ownMembers = members[own];
        otherMembers[bestPosition] = i;
        ownMembers[ownMembers.indexOf(i)] = j;
        assignment[i] = other;
        assignment[j] = own;
        swapped = true;
        break;
      }
    }
    if (!swapped) break;
    recomputeCentroids(xs, ys, assignment, capacities, cx, cy);
  }
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

    recomputeCentroids(xs, ys, assignment, capacities, cx, cy);
  }

  swapBetweenGroups(xs, ys, assignment, capacities, cx, cy);

  return new Map(
    clients.map(({ rowIndex }, i) => [rowIndex, assignment[i] + 1]),
  );
};
