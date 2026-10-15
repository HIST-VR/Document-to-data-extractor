import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { loadConfig } from "../src/lib/pipeline";
import { spreadsheetToText } from "../src/lib/spreadsheet";

describe("public config", () => {
  it("reads terms and the site key, and fails closed", async () => {
    const ready = await loadConfig(async () =>
      Response.json({ dataTerms: "paid", turnstileSiteKey: "site-key" }),
    );
    expect(ready).toEqual({ dataTerms: "paid", turnstileSiteKey: "site-key", status: "ready" });

    const down = await loadConfig(async () => {
      throw new Error("offline");
    });
    expect(down.status).toBe("unavailable");
  });
});

describe("spreadsheet text", () => {
  it("reads csv as text and xlsx through SheetJS", async () => {
    const csv = new File(["Назва;Сума\nПапір;10\n"], "book.csv", { type: "text/csv" });
    expect(await spreadsheetToText(csv, csv.name)).toContain("Папір");

    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Назва", "Сума"],
      ["Папір", 10],
    ]);
    XLSX.utils.book_append_sheet(book, sheet, "Лист");
    const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([bytes], "book.xlsx");
    const text = await spreadsheetToText(file, file.name);
    expect(text).toContain("Папір");
    expect(text).toContain("10");
  });
});
