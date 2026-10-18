import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";
import { getColumnLabels, readSheet } from "./sheet";

const toArrayBuffer = (data: Uint8Array): ArrayBuffer =>
  data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;

const encode = (text: string) => toArrayBuffer(new TextEncoder().encode(text));

const encodeWindows1252 = (text: string) =>
  toArrayBuffer(Uint8Array.from(text, (char) => char.charCodeAt(0)));

const buildXlsx = (
  sheets: Record<string, ReturnType<typeof utils.aoa_to_sheet>>,
) => {
  const workbook = utils.book_new();
  for (const [name, sheet] of Object.entries(sheets)) {
    utils.book_append_sheet(workbook, sheet, name);
  }
  return write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
};

describe("readSheet", () => {
  it("reads only the first sheet", () => {
    const data = buildXlsx({
      Primeira: utils.aoa_to_sheet([["nome"], ["A"]]),
      Segunda: utils.aoa_to_sheet([["outra"], ["B"]]),
    });

    const sheet = readSheet(data, "clientes.xlsx");

    expect(sheet.sheetName).toBe("Primeira");
    expect(sheet.rawRows).toEqual([["nome"], ["A"]]);
    expect(sheet.headerRowIndex).toBe(0);
  });

  it("keeps a quoted decimal comma as a string", () => {
    const sheet = readSheet(encode('nome,lat\nA,"-3,7319"\n'), "base.csv");

    expect(sheet.rawRows[1]).toEqual(["A", "-3,7319"]);
  });

  it("splits a semicolon-separated CSV keeping the comma", () => {
    const sheet = readSheet(
      encode("nome;lat;lng\nA;-3,7319;-38,5267\n"),
      "base.csv",
    );

    expect(sheet.rawRows).toEqual([
      ["nome", "lat", "lng"],
      ["A", "-3,7319", "-38,5267"],
    ]);
  });

  it("keeps the number format of a date cell", () => {
    const worksheet = utils.aoa_to_sheet([["data"], [45000]]);
    worksheet.A2.z = "dd/mm/yyyy";

    const sheet = readSheet(buildXlsx({ Dados: worksheet }), "datas.xlsx");

    expect(sheet.worksheet.A2.z).toBe("dd/mm/yyyy");
  });

  it("aligns rows and columns to A1 when data starts at B3", () => {
    const worksheet = utils.sheet_add_aoa(
      {},
      [
        ["nome", "lat"],
        ["A", 1],
      ],
      { origin: "B3" },
    );

    const sheet = readSheet(buildXlsx({ Dados: worksheet }), "base.xlsx");

    expect(sheet.rawRows[2]).toEqual([null, "nome", "lat"]);
    expect(sheet.rawRows[3]).toEqual([null, "A", 1]);
    expect(sheet.headerRowIndex).toBe(2);
  });

  it("decodes a UTF-8 CSV without BOM", () => {
    const sheet = readSheet(encode("Região;lat\nA;1\n"), "base.csv");

    expect(sheet.rawRows[0][0]).toBe("Região");
  });

  it("decodes a Windows-1252 CSV", () => {
    const sheet = readSheet(encodeWindows1252("Região;lat\nA;1\n"), "base.csv");

    expect(sheet.rawRows[0][0]).toBe("Região");
  });

  it("strips the UTF-8 BOM", () => {
    const sheet = readSheet(encode("﻿nome;lat\nA;1\n"), "base.csv");

    expect(sheet.rawRows[0][0]).toBe("nome");
  });

  it("throws on an empty file", () => {
    expect(() => readSheet(new ArrayBuffer(0), "vazio.csv")).toThrow(
      "O arquivo está vazio.",
    );
  });

  it("throws on a file with only blank cells", () => {
    expect(() => readSheet(encode(";;\n;;\n"), "vazio.csv")).toThrow(
      "O arquivo está vazio.",
    );
  });

  it("throws on a truncated xlsx", () => {
    const data = toArrayBuffer(Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 1, 2]));

    expect(() => readSheet(data, "quebrado.xlsx")).toThrow(
      "Não foi possível ler o arquivo.",
    );
  });
});

describe("getColumnLabels", () => {
  it("labels empty headers by column letter", () => {
    expect(getColumnLabels(["nome", "", ""])).toEqual([
      "nome",
      "Coluna B",
      "Coluna C",
    ]);
  });

  it("disambiguates duplicate headers by column letter", () => {
    expect(getColumnLabels(["nome", "", "Lat", "x", "y", "Lat"])).toEqual([
      "nome",
      "Coluna B",
      "Lat (C)",
      "x",
      "y",
      "Lat (F)",
    ]);
  });
});
