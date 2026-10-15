import { describe, expect, it } from "vitest";
import { checksByPath, validateExtraction, VALIDATION_RULES } from "../shared/validate";
import { emptySourced } from "../shared/schemas";
import type { Currency } from "../shared/types";
import { invoice, line, party, sourced } from "./fixture";

const now = new Date("2026-10-16T12:00:00Z");

function status(path: string, doc = invoice()) {
  const report = validateExtraction(doc, now);
  return checksByPath(report).get(path);
}

describe("validateExtraction", () => {
  it("passes a consistent invoice and counts every check", () => {
    const report = validateExtraction(invoice(), now);
    expect(report.unsupported).toBe(false);
    expect(report.errorCount).toBe(0);
    expect(report.passed).toBe(report.total);
    expect(report.total).toBeGreaterThan(10);
    expect(status("lineItems[0].amount")?.code).toBe("arithmetic-ok");
    expect(status("subtotal")?.code).toBe("sum-ok");
    expect(status("vatTotal")?.code).toBe("sum-ok");
    expect(status("total")?.code).toBe("sum-ok");
    expect(status("totalInWords")?.code).toBe("words-ok");
    expect(status("seller.edrpou")?.code).toBe("id-ok");
    expect(status("buyer.edrpou")?.code).toBe("id-absent");
    expect(status("issueDate")?.reason.uk.length).toBeGreaterThan(0);
  });

  it("accepts a line on the 0.01 boundary and rejects the next kopiyka", () => {
    const onBoundary = invoice({
      lineItems: [line({ quantity: 2, unitPrice: 10, amount: 20.01, vatRate: 0 })],
      subtotal: sourced(20.01),
      vatTotal: sourced(0),
      total: sourced(20.01),
      totalInWords: emptySourced<string>(),
    });
    expect(status("lineItems[0].amount", onBoundary)?.status).toBe("ok");

    const pastBoundary = invoice({
      ...onBoundary,
      lineItems: [line({ quantity: 2, unitPrice: 10, amount: 20.02, vatRate: 0 })],
    });
    expect(status("lineItems[0].amount", pastBoundary)?.status).toBe("error");
  });

  it("checks mixed 20%, 7%, and 0% VAT from the printed line amounts", () => {
    const doc = invoice({
      lineItems: [
        line({ quantity: 1, unitPrice: 100, amount: 100, vatRate: 0.2 }),
        line({ quantity: 1, unitPrice: 100, amount: 100, vatRate: 0.07, description: "Пільга" }),
        line({ quantity: 1, unitPrice: 50, amount: 50, vatRate: 0, description: "Без ПДВ" }),
      ],
      subtotal: sourced(250),
      vatTotal: sourced(27),
      total: sourced(277),
      totalInWords: emptySourced<string>(),
    });
    const report = validateExtraction(doc, now);
    expect(report.errorCount).toBe(0);
    expect(checksByPath(report).get("vatTotal")?.code).toBe("sum-ok");
  });

  it("flags an arithmetic error on a line even when the printed subtotal adds up", () => {
    const doc = invoice({
      lineItems: [
        line({ quantity: 2, unitPrice: 100, amount: 180, vatRate: 0.2 }),
        line({ quantity: 1, unitPrice: 10, amount: 9, vatRate: 0 }),
        line({ quantity: 3, unitPrice: 5, amount: 10, vatRate: 0 }),
      ],
      subtotal: sourced(199),
      vatTotal: sourced(36),
      total: sourced(235),
    });
    const report = validateExtraction(doc, now);
    expect(report.errorCount).toBeGreaterThanOrEqual(3);
    expect(checksByPath(report).get("subtotal")?.status).toBe("ok");
    expect(checksByPath(report).get("lineItems[0].amount")?.code).toBe("arithmetic-off");
  });

  it("warns when numbers needed for a check are missing", () => {
    const doc = invoice({
      documentNumber: emptySourced<string>(),
      issueDate: emptySourced<string>(),
      currency: emptySourced<Currency>(),
      lineItems: [line({ quantity: null, unitPrice: 10, amount: null, vatRate: null, description: null, unit: null })],
      subtotal: emptySourced<number>(),
      vatTotal: emptySourced<number>(),
      total: emptySourced<number>(),
      totalInWords: emptySourced<string>(),
      paymentPurpose: emptySourced<string>(),
    });
    const report = validateExtraction(doc, now);
    const byPath = checksByPath(report);
    expect(byPath.get("documentNumber")?.status).toBe("warning");
    expect(byPath.get("issueDate")?.code).toBe("date-missing");
    expect(byPath.get("currency")?.code).toBe("currency-missing");
    expect(byPath.get("lineItems[0].description")?.status).toBe("warning");
    expect(byPath.get("lineItems[0].unit")?.code).toBe("absent");
    expect(byPath.get("lineItems[0].amount")?.code).toBe("arithmetic-incomplete");
    expect(byPath.get("lineItems[0].vatRate")?.code).toBe("vat-missing");
    expect(byPath.get("subtotal")?.code).toBe("sum-incomplete");
    expect(byPath.get("vatTotal")?.code).toBe("sum-incomplete");
    expect(byPath.get("total")?.code).toBe("sum-incomplete");
    expect(byPath.get("totalInWords")?.code).toBe("words-missing");
    expect(byPath.get("paymentPurpose")?.code).toBe("absent");
    expect(report.errorCount).toBe(0);
  });

  it("errors on a bad VAT rate, a bad date, and identifier failures", () => {
    const doc = invoice({
      issueDate: sourced("1990-01-01"),
      seller: party({ edrpou: "14360571", ipn: "123456789", iban: "UA213223130000026007233566002" }),
      buyer: party({ name: null, edrpou: "ABC", ipn: "1234567890", iban: "DE89370400440532013000" }),
      lineItems: [line({ vatRate: 0.15 })],
      totalInWords: sourced("невідомий зворот"),
    });
    const report = validateExtraction(doc, now);
    const byPath = checksByPath(report);
    expect(byPath.get("issueDate")?.code).toBe("date-implausible");
    expect(byPath.get("seller.edrpou")?.code).toBe("id-checksum");
    expect(byPath.get("seller.ipn")?.code).toBe("id-format");
    expect(byPath.get("seller.iban")?.code).toBe("id-checksum");
    expect(byPath.get("buyer.name")?.status).toBe("warning");
    expect(byPath.get("buyer.edrpou")?.code).toBe("id-format");
    expect(byPath.get("buyer.ipn")?.code).toBe("id-checksum");
    expect(byPath.get("buyer.iban")?.code).toBe("id-format");
    expect(byPath.get("lineItems[0].vatRate")?.code).toBe("vat-bad");
    expect(byPath.get("totalInWords")?.code).toBe("words-unchecked");
    expect(byPath.get("subtotal")?.code).toBe("sum-ok");
  });

  it("errors when the amount in words parses and disagrees", () => {
    const doc = invoice({ totalInWords: sourced("Сто гривень 00 копійок") });
    expect(status("totalInWords", doc)?.code).toBe("words-off");
  });

  it("does not compare words when the total is missing", () => {
    const doc = invoice({
      total: emptySourced<number>(),
      totalInWords: sourced("Двісті сорок гривень 00 копійок"),
    });
    expect(status("totalInWords", doc)?.code).toBe("words-unchecked");
    expect(status("total", doc)?.code).toBe("sum-incomplete");
  });

  it("rejects an unreadable issue date and a total that does not add up", () => {
    const doc = invoice({
      issueDate: sourced("not-a-date"),
      total: sourced(999),
      subtotal: sourced(200),
      vatTotal: sourced(40),
    });
    expect(status("issueDate", doc)?.code).toBe("date-invalid");
    expect(status("total", doc)?.code).toBe("sum-off");
  });

  it("compares an empty document's totals with zero and flags a non-zero subtotal", () => {
    const empty = invoice({
      lineItems: [],
      subtotal: sourced(0),
      vatTotal: sourced(0),
      total: sourced(0),
      totalInWords: sourced("нуль гривень 00 копійок"),
    });
    expect(status("subtotal", empty)?.status).toBe("ok");
    expect(status("vatTotal", empty)?.status).toBe("ok");

    const drifted = invoice({
      lineItems: [],
      subtotal: sourced(10),
      vatTotal: sourced(0),
      total: sourced(10),
    });
    expect(status("subtotal", drifted)?.code).toBe("sum-off");
    expect(status("vatTotal", drifted)?.code).toBe("sum-ok");
  });

  it("warns on VAT when a line rate is missing even if other lines are complete", () => {
    const doc = invoice({
      lineItems: [line({ vatRate: null })],
      vatTotal: sourced(40),
    });
    expect(status("vatTotal", doc)?.code).toBe("sum-incomplete");
  });

  it("returns no field checks for an unsupported document", () => {
    const report = validateExtraction(invoice({ documentType: "unknown" }), now);
    expect(report).toEqual({
      unsupported: true,
      checks: [],
      passed: 0,
      total: 0,
      errorCount: 0,
    });
  });

  it("lists the rules the product claims to run", () => {
    expect(VALIDATION_RULES.map((rule) => rule.id)).toEqual([
      "line-amount",
      "subtotal",
      "vat",
      "total",
      "edrpou",
      "ipn",
      "iban",
      "date",
      "words",
    ]);
    for (const rule of VALIDATION_RULES) {
      expect(rule.en.length).toBeGreaterThan(10);
      expect(rule.uk.length).toBeGreaterThan(10);
    }
  });
});
