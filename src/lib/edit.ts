import { normalizeDateString } from "../../shared/dates";
import { normalizeAmountString, normalizeVatRate } from "../../shared/normalize";
import type { Currency, DocumentType, Extraction, Sourced } from "../../shared/types";

export type FieldKind = "text" | "id" | "date" | "currency" | "number" | "vat";

const DOCUMENT_TYPES = new Set<DocumentType>(["invoice", "act", "waybill", "unknown"]);

const TOP = {
  documentNumber: "text",
  issueDate: "date",
  currency: "currency",
  subtotal: "number",
  vatTotal: "number",
  total: "number",
  totalInWords: "text",
  paymentPurpose: "text",
} as const;

const PARTY = {
  name: "text",
  edrpou: "id",
  ipn: "id",
  iban: "id",
  address: "text",
} as const;

const LINE = {
  description: "text",
  unit: "text",
  quantity: "number",
  unitPrice: "number",
  vatRate: "vat",
  amount: "number",
} as const;

type TopPath = keyof typeof TOP;
type PartyField = keyof typeof PARTY;
type LineField = keyof typeof LINE;

export function parseRaw(kind: FieldKind, raw: string): string | number | Currency | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (kind === "text") return trimmed;
  if (kind === "id") return trimmed.replace(/[\s\u00A0]/g, "").toUpperCase();
  if (kind === "date") return normalizeDateString(trimmed) ?? trimmed;
  if (kind === "currency") {
    return trimmed === "UAH" || trimmed === "USD" || trimmed === "EUR" ? trimmed : null;
  }
  const amount = normalizeAmountString(trimmed);
  if (amount == null) return null;
  return kind === "vat" ? normalizeVatRate(amount) : amount;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const negative = value < 0;
  const [intPart, fraction] = Math.abs(value).toString().split(".");
  const grouped = (intPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const body = fraction ? `${grouped},${fraction}` : grouped;
  return negative ? `-${body}` : body;
}

export function formatFieldValue(kind: FieldKind, value: string | number | null): string {
  if (value == null) return "";
  if (kind === "vat" && typeof value === "number") {
    if (Math.abs(value - 0.2) < 1e-9) return "20%";
    if (Math.abs(value - 0.07) < 1e-9) return "7%";
    if (Math.abs(value) < 1e-9) return "0%";
  }
  if (typeof value === "number") return formatNumber(value);
  return value;
}

function isKey<T extends object>(map: T, key: string): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(map, key);
}

interface Located {
  kind: FieldKind;
  sourced: Sourced<string | number | Currency>;
}

function topField(doc: Extraction, path: TopPath): Sourced<string | number | Currency> {
  switch (path) {
    case "documentNumber":
      return doc.documentNumber;
    case "issueDate":
      return doc.issueDate;
    case "currency":
      return doc.currency;
    case "subtotal":
      return doc.subtotal;
    case "vatTotal":
      return doc.vatTotal;
    case "total":
      return doc.total;
    case "totalInWords":
      return doc.totalInWords;
    case "paymentPurpose":
      return doc.paymentPurpose;
  }
}

function locate(doc: Extraction, path: string): Located | null {
  if (isKey(TOP, path)) {
    return { kind: TOP[path], sourced: topField(doc, path) };
  }

  const party = /^(seller|buyer)\.([A-Za-z]+)$/.exec(path);
  const partyField = party?.[2];
  const partyRole = party?.[1];
  if (partyField && partyRole && isKey(PARTY, partyField)) {
    const sourced = doc[partyRole as "seller" | "buyer"][partyField as PartyField] as Sourced<string>;
    return { kind: PARTY[partyField], sourced };
  }

  const line = /^lineItems\[(\d+)\]\.([A-Za-z]+)$/.exec(path);
  const lineField = line?.[2];
  const index = line?.[1] == null ? Number.NaN : Number(line[1]);
  const item = doc.lineItems[index];
  if (lineField && item && isKey(LINE, lineField)) {
    const sourced = item[lineField as LineField] as Sourced<string | number>;
    return { kind: LINE[lineField], sourced };
  }

  return null;
}

export function commitField<T extends Extraction>(doc: T, path: string, raw: string): T {
  if (!locate(doc, path)) return doc;
  const next = structuredClone(doc);
  const target = locate(next, path);
  if (!target) return doc;
  (target.sourced as { value: string | number | Currency | null }).value = parseRaw(target.kind, raw);
  return next;
}

export function commitDocumentType<T extends Extraction>(doc: T, raw: string): T {
  if (!DOCUMENT_TYPES.has(raw as DocumentType)) return doc;
  const next = structuredClone(doc);
  next.documentType = raw as DocumentType;
  return next;
}

export function fieldKind(path: string, doc: Extraction): FieldKind | null {
  return locate(doc, path)?.kind ?? null;
}
