import { read, utils, type WorkBook } from "xlsx";
import { getFirstNonEmptyRowIndex, isEmptyRow, type Sheet } from "./planner";

const READ_ERROR = "Não foi possível ler o arquivo.";
const EMPTY_ERROR = "O arquivo está vazio.";

// SheetJS reads a UTF-8 CSV without BOM as Latin-1, garbling accents.
const decodeCsv = (data: ArrayBuffer) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    return new TextDecoder("windows-1252").decode(data);
  }
};

const parseWorkbook = (data: ArrayBuffer, fileName: string): WorkBook => {
  // `raw` keeps "-3,7319" as a string in CSV; `cellNF` keeps number formats for the export.
  const options = { raw: true, cellNF: true };
  if (/\.csv$/i.test(fileName)) {
    return read(decodeCsv(data), { ...options, type: "string" });
  }
  return read(data, { ...options, type: "array" });
};

export const readSheet = (data: ArrayBuffer, fileName: string): Sheet => {
  if (data.byteLength === 0) throw new Error(EMPTY_ERROR);

  let workbook: WorkBook;
  try {
    workbook = parseWorkbook(data, fileName);
  } catch (error) {
    throw new Error(READ_ERROR, { cause: error });
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheetName || !worksheet) throw new Error(READ_ERROR);
  if (!worksheet["!ref"]) throw new Error(EMPTY_ERROR);

  // Forcing the range start to A1 keeps `rawRows[i]` aligned with sheet row `i + 1`.
  const range = utils.decode_range(worksheet["!ref"]);
  range.s = { r: 0, c: 0 };
  const rawRows = utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: true,
    defval: null,
    range,
  });
  if (rawRows.every(isEmptyRow)) throw new Error(EMPTY_ERROR);

  return {
    fileName,
    sheetName,
    worksheet,
    rawRows,
    headerRowIndex: getFirstNonEmptyRowIndex(rawRows),
  };
};

export const getColumnLabels = (headers: string[]): string[] => {
  const counts = new Map<string, number>();
  for (const header of headers) {
    counts.set(header, (counts.get(header) ?? 0) + 1);
  }
  return headers.map((header, i) => {
    if (header === "") return `Coluna ${utils.encode_col(i)}`;
    if ((counts.get(header) ?? 0) > 1) {
      return `${header} (${utils.encode_col(i)})`;
    }
    return header;
  });
};
