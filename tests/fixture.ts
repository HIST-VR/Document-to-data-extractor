import { emptyExtraction, emptySourced } from "../shared/schemas";
import type { Extraction, LineItem, Party, Sourced } from "../shared/types";

export function sourced<T>(value: T | null, evidence?: string | null, page?: number | null): Sourced<T> {
  if (value == null) {
    return emptySourced<T>();
  }
  return {
    value,
    evidence: evidence === undefined ? String(value) : evidence,
    page: page === undefined ? 1 : page,
  };
}

export function party(overrides: Partial<{ [K in keyof Party]: Party[K]["value"] }> = {}): Party {
  return {
    name: sourced(overrides.name === undefined ? "ТОВ «Поле»" : overrides.name),
    edrpou: sourced(overrides.edrpou === undefined ? "14360570" : overrides.edrpou),
    ipn: sourced(overrides.ipn === undefined ? "1234567899" : overrides.ipn),
    iban: sourced(overrides.iban === undefined ? "UA213223130000026007233566001" : overrides.iban),
    address: sourced(overrides.address === undefined ? "м. Київ" : overrides.address),
  };
}

export function line(overrides: Partial<{ [K in keyof LineItem]: LineItem[K]["value"] }> = {}): LineItem {
  return {
    description: sourced(overrides.description === undefined ? "Послуги" : overrides.description),
    unit: sourced(overrides.unit === undefined ? "послуга" : overrides.unit),
    quantity: sourced(overrides.quantity === undefined ? 2 : overrides.quantity),
    unitPrice: sourced(overrides.unitPrice === undefined ? 100 : overrides.unitPrice),
    vatRate: sourced(overrides.vatRate === undefined ? 0.2 : overrides.vatRate),
    amount: sourced(overrides.amount === undefined ? 200 : overrides.amount),
  };
}

export function invoice(overrides: Partial<Extraction> = {}): Extraction {
  const base = emptyExtraction("invoice");
  return {
    ...base,
    documentType: "invoice",
    documentNumber: sourced("42"),
    issueDate: sourced("2026-03-16"),
    currency: sourced("UAH"),
    seller: party(),
    buyer: party({ name: "ФОП Шевченко", edrpou: null, ipn: "9000000002" }),
    lineItems: [line()],
    subtotal: sourced(200),
    vatTotal: sourced(40),
    total: sourced(240),
    totalInWords: sourced("Двісті сорок гривень 00 копійок"),
    paymentPurpose: sourced("Оплата за послуги"),
    ...overrides,
  };
}
