import { describe, expect, it } from "vitest";
import { checksByPath, validateExtraction } from "../shared/validate";
import { invoice } from "./fixture";
import { commitDocumentType, commitField, formatFieldValue, parseRaw } from "../src/lib/edit";

const NOW = new Date("2026-10-16T12:00:00Z");

describe("field edits", () => {
  it("normalizes amounts, VAT, dates, and identifiers", () => {
    expect(parseRaw("number", "1 234,56")).toBe(1234.56);
    expect(parseRaw("vat", "20%")).toBe(0.2);
    expect(parseRaw("vat", "7")).toBe(0.07);
    expect(parseRaw("date", "16.03.2026")).toBe("2026-03-16");
    expect(parseRaw("date", "32.13.2026")).toBe("32.13.2026");
    expect(parseRaw("id", "ua58 3052990000002600123456789")).toBe("UA583052990000002600123456789");
    expect(parseRaw("text", "  ")).toBeNull();
    expect(parseRaw("currency", "usd")).toBeNull();
    expect(formatFieldValue("vat", 0.2)).toBe("20%");
    expect(formatFieldValue("number", 10080)).toBe("10 080");
  });

  it("revalidates an edited line amount", () => {
    const broken = commitField(invoice(), "lineItems[0].amount", "10");
    const report = validateExtraction(broken, NOW);
    expect(checksByPath(report).get("lineItems[0].amount")?.status).toBe("error");
    expect(report.errorCount).toBeGreaterThan(0);

    const restored = commitField(broken, "lineItems[0].amount", "200");
    const again = validateExtraction(restored, NOW);
    expect(checksByPath(again).get("lineItems[0].amount")?.status).toBe("ok");
    expect(again.errorCount).toBe(0);
  });

  it("keeps field values when the type changes to unknown", () => {
    const original = invoice();
    const next = commitDocumentType(original, "unknown");
    expect(next.documentType).toBe("unknown");
    expect(next.documentNumber.value).toBe("42");
    expect(validateExtraction(next, NOW).unsupported).toBe(true);
    expect(commitDocumentType(original, "memo")).toBe(original);
    expect(commitField(original, "missing.path", "x")).toBe(original);
  });
});
