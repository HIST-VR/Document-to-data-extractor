import { describe, expect, it } from "vitest";
import { normalizeAmountString, normalizeRawExtraction, normalizeVatRate } from "../shared/normalize";

describe("normalizeAmountString", () => {
  it("reads Ukrainian grouped amounts and NBSP", () => {
    expect(normalizeAmountString("1 234,56")).toBe(1234.56);
    expect(normalizeAmountString("1\u00A0234,56")).toBe(1234.56);
    expect(normalizeAmountString("1\u202F234,56")).toBe(1234.56);
    expect(normalizeAmountString("12,5")).toBe(12.5);
  });

  it("reads mixed separators and plain decimals", () => {
    expect(normalizeAmountString("1234.56")).toBe(1234.56);
    expect(normalizeAmountString("1,234.56")).toBe(1234.56);
    expect(normalizeAmountString("1.234,56")).toBe(1234.56);
    expect(normalizeAmountString("1,234,567")).toBe(1234567);
    expect(normalizeAmountString("1.234.567")).toBe(1234567);
    expect(normalizeAmountString("20%")).toBe(20);
  });

  it("rejects blank and non-numeric text", () => {
    expect(normalizeAmountString("")).toBeNull();
    expect(normalizeAmountString("   ")).toBeNull();
    expect(normalizeAmountString("%")).toBeNull();
    expect(normalizeAmountString("abc")).toBeNull();
    expect(normalizeAmountString("12.3.4x")).toBeNull();
  });
});

describe("normalizeVatRate", () => {
  it("treats 20 and 7 as percents", () => {
    expect(normalizeVatRate(20)).toBe(0.2);
    expect(normalizeVatRate(7)).toBe(0.07);
    expect(normalizeVatRate(0)).toBe(0);
    expect(normalizeVatRate(0.2)).toBe(0.2);
    expect(normalizeVatRate(19)).toBe(19);
  });
});

describe("normalizeRawExtraction", () => {
  it("returns non-objects unchanged", () => {
    expect(normalizeRawExtraction(null)).toBeNull();
    expect(normalizeRawExtraction(["invoice"])).toEqual(["invoice"]);
  });

  it("normalizes amounts, dates, identifiers, currency, and evidence", () => {
    const normalized = normalizeRawExtraction({
      documentType: " Invoice ",
      documentNumber: { value: " 42\u00A0", evidence: " \u00A0№ 42 ", page: 1 },
      issueDate: { value: "16.03.2026", evidence: "16.03.2026", page: 1 },
      currency: { value: "uah", evidence: "грн", page: 1 },
      subtotal: { value: "1 000,50", evidence: "1 000,50", page: 1 },
      vatTotal: { value: "", evidence: "", page: null },
      total: { value: 1200.5, evidence: "1200.50", page: 1 },
      totalInWords: { value: "  text ", evidence: "text", page: 1 },
      paymentPurpose: { value: "оплата", evidence: 12, page: 1 },
      seller: {
        name: { value: " ТОВ ", evidence: "ТОВ", page: 1 },
        edrpou: { value: "1436 0570", evidence: "14360570", page: 1 },
        ipn: { value: "", evidence: null, page: null },
        iban: { value: "ua21 3223 1300 0002 6007 2335 6600 1", evidence: "iban", page: 1 },
        address: { value: "Київ", evidence: "Київ", page: 1 },
      },
      buyer: "not-a-party",
      lineItems: [
        {
          description: { value: "робота", evidence: "робота", page: 1 },
          unit: { value: "шт", evidence: "шт", page: 1 },
          quantity: { value: "2", evidence: "2", page: 1 },
          unitPrice: { value: "10,5", evidence: "10,5", page: 1 },
          vatRate: { value: "20%", evidence: "20%", page: 1 },
          amount: { value: "21,00", evidence: "21,00", page: 1 },
        },
        "bad-line",
      ],
    }) as Record<string, unknown>;

    expect(normalized.documentType).toBe("invoice");
    expect(normalized.documentNumber).toMatchObject({ value: "42", evidence: "№ 42" });
    expect(normalized.issueDate).toMatchObject({ value: "2026-03-16" });
    expect(normalized.currency).toMatchObject({ value: "UAH" });
    expect(normalized.subtotal).toMatchObject({ value: 1000.5 });
    expect(normalized.vatTotal).toMatchObject({ value: null, evidence: null });
    expect(normalized.totalInWords).toMatchObject({ value: "text" });
    expect(normalized.paymentPurpose).toMatchObject({ evidence: 12 });
    expect(normalized.seller).toMatchObject({
      edrpou: { value: "14360570" },
      ipn: { value: null },
      iban: { value: "UA213223130000026007233566001" },
    });
    expect(normalized.buyer).toBe("not-a-party");
    expect(normalized.lineItems).toMatchObject([
      { quantity: { value: 2 }, unitPrice: { value: 10.5 }, vatRate: { value: 0.2 }, amount: { value: 21 } },
      "bad-line",
    ]);
  });

  it("leaves an unreadable amount string for the schema to reject", () => {
    const normalized = normalizeRawExtraction({
      subtotal: { value: "багато", evidence: null, page: null },
      issueDate: { value: "вчора", evidence: null, page: null },
      lineItems: { not: "an array" },
    }) as { subtotal: { value: string }; issueDate: { value: string }; lineItems: unknown };
    expect(normalized.subtotal.value).toBe("багато");
    expect(normalized.issueDate.value).toBe("вчора");
    expect(normalized.lineItems).toEqual({ not: "an array" });
  });

  it("ignores a sourced field that is not an object", () => {
    const normalized = normalizeRawExtraction({
      total: "240",
      seller: { name: "ТОВ" },
    }) as { total: string; seller: { name: string } };
    expect(normalized.total).toBe("240");
    expect(normalized.seller.name).toBe("ТОВ");
  });

  it("normalizes a numeric VAT rate already expressed as a percent", () => {
    const normalized = normalizeRawExtraction({
      lineItems: [{ vatRate: { value: 7, evidence: "7%", page: 1 } }],
    }) as { lineItems: Array<{ vatRate: { value: number } }> };
    expect(normalized.lineItems[0]?.vatRate.value).toBe(0.07);
  });
});
