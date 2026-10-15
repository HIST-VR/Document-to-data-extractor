import type { Extraction, ResultExtraction } from "../../shared/types";

type Cell = string | number | null;

export function downloadName(name: string, extension: string): string {
  const base = name.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  const clean = base.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${clean || "document"}.${extension}`;
}

export function extractionJson(extraction: ResultExtraction): string {
  return `${JSON.stringify(extraction, null, 2)}\n`;
}

export function headerRows(extraction: Extraction): Cell[][] {
  const rows: Cell[][] = [
    ["field", "value"],
    ["documentType", extraction.documentType],
    ["documentNumber", extraction.documentNumber.value],
    ["issueDate", extraction.issueDate.value],
    ["currency", extraction.currency.value],
  ];
  for (const role of ["seller", "buyer"] as const) {
    const party = extraction[role];
    rows.push(
      [`${role}.name`, party.name.value],
      [`${role}.edrpou`, party.edrpou.value],
      [`${role}.ipn`, party.ipn.value],
      [`${role}.iban`, party.iban.value],
      [`${role}.address`, party.address.value],
    );
  }
  rows.push(
    ["subtotal", extraction.subtotal.value],
    ["vatTotal", extraction.vatTotal.value],
    ["total", extraction.total.value],
    ["totalInWords", extraction.totalInWords.value],
    ["paymentPurpose", extraction.paymentPurpose.value],
  );
  return rows.map(guardRow);
}

export function lineRows(extraction: Extraction): Cell[][] {
  const rows: Cell[][] = [["description", "unit", "quantity", "unitPrice", "vatRate", "amount"]];
  for (const line of extraction.lineItems) {
    rows.push([
      line.description.value,
      line.unit.value,
      line.quantity.value,
      line.unitPrice.value,
      line.vatRate.value,
      line.amount.value,
    ]);
  }
  return rows.map(guardRow);
}

export function lineItemsCsv(extraction: Extraction): string {
  const lines = lineRows(extraction).map((row) => row.map(csvCell).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export async function workbookBytes(extraction: Extraction): Promise<Uint8Array> {
  const XLSX = await import("xlsx");
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(headerRows(extraction)), "Header");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(lineRows(extraction)), "Lines");
  const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer | Uint8Array | number[];
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  return Uint8Array.from(bytes);
}

function guardRow(row: Cell[]): Cell[] {
  return row.map((cell) => (typeof cell === "string" ? guardText(cell) : cell));
}

function guardText(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: Cell): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (/[;"\r\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
