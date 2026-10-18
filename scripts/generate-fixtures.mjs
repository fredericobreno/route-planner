import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

XLSX.set_fs(fs);

const OUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
);

// Seeded LCG so every run produces the same coordinates.
const createRandom = (seed) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
};

const FORTALEZA = { lat: -3.73, lng: -38.52, spread: 0.12 };
const SAO_PAULO = { lat: -23.55, lng: -46.63, spread: 0.12 };

const round = (value) => Math.round(value * 1e6) / 1e6;

const createClients = (count, seed, center = FORTALEZA) => {
  const random = createRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    name: `Cliente ${String(i + 1).padStart(4, "0")}`,
    city: "Fortaleza",
    lat: round(center.lat + (random() - 0.5) * 2 * center.spread),
    lng: round(center.lng + (random() - 0.5) * 2 * center.spread),
  }));
};

const HEADER = ["Nome", "Cidade", "Latitude", "Longitude"];
const toRow = ({ name, city, lat, lng }) => [name, city, lat, lng];

const writeWorkbook = (fileName, sheets, bookType = "xlsx") => {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  XLSX.writeFile(workbook, path.join(OUT_DIR, fileName), {
    bookType,
    compression: true,
  });
};

const writeText = (fileName, text) => {
  fs.writeFileSync(path.join(OUT_DIR, fileName), text, "utf8");
};

fs.mkdirSync(OUT_DIR, { recursive: true });

writeWorkbook("multi-sheet.xlsx", [
  ["Clientes", [HEADER, ...createClients(20, 1).map(toRow)]],
  [
    "Outros",
    [
      HEADER,
      ...createClients(20, 2, SAO_PAULO).map((client) =>
        toRow({ ...client, city: "São Paulo" }),
      ),
    ],
  ],
]);

writeWorkbook(
  "legacy.xls",
  [["Clientes", [HEADER, ...createClients(15, 3).map(toRow)]]],
  "biff8",
);

const toDecimalComma = (value) => String(value).replace(".", ",");
writeText(
  "decimal-comma.csv",
  [
    "Nome;Município;Latitude;Longitude",
    ...createClients(25, 4).map(({ name, lat, lng }) =>
      [name, "Fortaleza", toDecimalComma(lat), toDecimalComma(lng)].join(";"),
    ),
  ]
    .map((line) => `${line}\n`)
    .join(""),
);

writeWorkbook("invalid-coordinates.xlsx", [
  [
    "Clientes",
    [
      HEADER,
      ...createClients(10, 5).map(toRow),
      ["Sem coordenada", "Fortaleza", "", ""],
      ["Texto", "Fortaleza", "abc", -38.52],
      ["Latitude alta", "Fortaleza", 95, -38.52],
      ["Longitude baixa", "Fortaleza", -3.73, -200],
    ],
  ],
]);

writeWorkbook("existing-region.xlsx", [
  [
    "Clientes",
    [
      ["Nome", "Região", "Latitude", "Longitude"],
      ...createClients(12, 6).map(({ name, lat, lng }, i) => [
        name,
        `Antiga ${(i % 3) + 1}`,
        lat,
        lng,
      ]),
    ],
  ],
]);

writeWorkbook("title-rows.xlsx", [
  [
    "Clientes",
    [
      ["Relatório de clientes"],
      ["Gerado em 01/10/2026"],
      [],
      HEADER,
      ...createClients(30, 7).map(toRow),
    ],
  ],
]);

writeWorkbook("empty-rows.xlsx", [
  [
    "Clientes",
    [
      HEADER,
      ...createClients(12, 8).flatMap((client, i) =>
        i % 4 === 3 ? [toRow(client), [], []] : [toRow(client)],
      ),
    ],
  ],
]);

writeWorkbook("103-clients.xlsx", [
  ["Clientes", [HEADER, ...createClients(103, 9).map(toRow)]],
]);

writeWorkbook("5000-clients.xlsx", [
  [
    "Clientes",
    [
      HEADER,
      ...createClients(5000, 10, { ...FORTALEZA, spread: 0.3 }).map(toRow),
    ],
  ],
]);

writeText("empty.csv", "");

console.log(`Fixtures written to ${OUT_DIR}`);
