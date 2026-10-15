import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { invoice, line } from "./fixture";
import { downloadName, extractionJson, headerRows, lineItemsCsv, lineRows, workbookBytes } from "../src/lib/export-doc";
import { keepLatest, type HistoryRecord } from "../src/lib/history";
import { safeParseExtraction } from "../shared/schemas";

describe("exports", () => {
  const doc = invoice({
    lineItems: [line({ description: "Послуги; звіт", unitPrice: 100 })],
  });

  it("names a download from the file name", () => {
    expect(downloadName("invoice.pdf", "json")).toBe("invoice.json");
    expect(downloadName("рахунок 1.csv", "xlsx")).toBe("рахунок-1.xlsx");
    expect(downloadName("", "csv")).toBe("document.csv");
  });

  it("writes line items as semicolon CSV and quotes separators", () => {
    const csv = lineItemsCsv(doc);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("description;unit;quantity;unitPrice;vatRate;amount");
    expect(csv).toContain('"Послуги; звіт"');
    expect(csv).toContain("0.2");
    expect(csv).not.toContain("evidence");
  });

  it("prefixes a formula-like line so a spreadsheet does not treat it as a formula", () => {
    const csv = lineItemsCsv(invoice({ lineItems: [line({ description: "=1+1" })] }));
    expect(csv).toContain("'=1+1");
  });

  it("round-trips JSON through the schema", () => {
    const parsed = safeParseExtraction(JSON.parse(extractionJson(doc)));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.documentNumber.value).toBe("42");
  });

  it("puts the header on sheet 1 and the lines on sheet 2", async () => {
    const book = XLSX.read(await workbookBytes(doc), { type: "array" });
    expect(book.SheetNames).toEqual(["Header", "Lines"]);
    const header = XLSX.utils.sheet_to_json<(string | number | null)[]>(book.Sheets.Header ?? {}, { header: 1 });
    const lines = XLSX.utils.sheet_to_json<(string | number | null)[]>(book.Sheets.Lines ?? {}, { header: 1 });
    expect(header.some((row) => row[0] === "documentNumber" && row[1] === "42")).toBe(true);
    expect(lines[1]?.[0]).toBe("Послуги; звіт");
    expect(headerRows(doc)[0]).toEqual(["field", "value"]);
    expect(lineRows(doc)[0]?.[0]).toBe("description");
  });
});

describe("history retention", () => {
  it("keeps the ten newest records and drops the file", () => {
    const records: HistoryRecord[] = Array.from({ length: 12 }, (_, index) => ({
      id: String(index),
      name: `file-${index}.pdf`,
      documentType: "invoice",
      createdAt: `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      extraction: invoice(),
    }));
    const kept = keepLatest(records);
    expect(kept).toHaveLength(10);
    expect(kept[0]?.id).toBe("11");
    expect(kept[9]?.id).toBe("2");
    expect(Object.keys(kept[0] ?? {}).sort()).toEqual(["createdAt", "documentType", "extraction", "id", "name"]);
  });
});
