import { normalizeDateString } from "./dates";

const NUMERIC_KEYS = new Set([
  "quantity",
  "unitPrice",
  "vatRate",
  "amount",
  "subtotal",
  "vatTotal",
  "total",
]);

const DATE_KEYS = new Set(["issueDate"]);

const ID_KEYS = new Set(["edrpou", "ipn", "iban"]);

/** Ukrainian "1 234,56", NBSP, and mixed 1.234,56 / 1,234.56 separators. */
export function normalizeAmountString(raw: string): number | null {
  let value = raw.replace(/[\u00A0\u202F\u2007\u2009]/g, " ").trim();
  if (!value) {
    return null;
  }
  value = value.replace(/%$/, "").trim().replace(/\s/g, "");
  if (!value) {
    return null;
  }

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    const parts = value.split(",");
    value = parts.length > 2 ? parts.join("") : value.replace(",", ".");
  } else if (lastDot >= 0 && value.split(".").length > 2) {
    value = value.replace(/\./g, "");
  }

  if (!/^[+-]?\d+(\.\d+)?$/.test(value)) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** 20 and 7 mean percent. 0.2, 0.07, and 0 stay as rates. Other numbers are unchanged. */
export function normalizeVatRate(value: number): number {
  if (value === 20 || value === 7) {
    return value / 100;
  }
  return value;
}

function cleanString(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, " ").trim();
}

function normalizeValue(key: string, value: unknown): unknown {
  if (typeof value === "string") {
    const cleaned = cleanString(value);
    if (!cleaned) {
      return null;
    }
    if (NUMERIC_KEYS.has(key)) {
      const amount = normalizeAmountString(cleaned);
      if (amount == null) {
        return cleaned;
      }
      return key === "vatRate" ? normalizeVatRate(amount) : amount;
    }
    if (DATE_KEYS.has(key)) {
      return normalizeDateString(cleaned) ?? cleaned;
    }
    if (ID_KEYS.has(key)) {
      return cleaned.replace(/[\s\u00A0]/g, "").toUpperCase();
    }
    if (key === "currency") {
      return cleaned.toUpperCase();
    }
    return cleaned;
  }
  if (typeof value === "number" && key === "vatRate") {
    return normalizeVatRate(value);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSourced(key: string, node: unknown): unknown {
  if (!isRecord(node) || !("value" in node)) {
    return node;
  }
  return {
    ...node,
    value: normalizeValue(key, node.value),
    evidence: typeof node.evidence === "string" ? cleanString(node.evidence) || null : node.evidence,
  };
}

const PARTY_KEYS = ["name", "edrpou", "ipn", "iban", "address"] as const;

const LINE_KEYS = ["description", "unit", "quantity", "unitPrice", "vatRate", "amount"] as const;

function normalizeParty(node: unknown): unknown {
  if (!isRecord(node)) {
    return node;
  }
  const next: Record<string, unknown> = { ...node };
  for (const key of PARTY_KEYS) {
    if (key in next) {
      next[key] = normalizeSourced(key, next[key]);
    }
  }
  return next;
}

function normalizeLine(node: unknown): unknown {
  if (!isRecord(node)) {
    return node;
  }
  const next: Record<string, unknown> = { ...node };
  for (const key of LINE_KEYS) {
    if (key in next) {
      next[key] = normalizeSourced(key, next[key]);
    }
  }
  return next;
}

const ROOT_SOURCED = [
  "documentNumber",
  "issueDate",
  "currency",
  "subtotal",
  "vatTotal",
  "total",
  "totalInWords",
  "paymentPurpose",
] as const;

/** Walks a model payload and normalizes amounts, dates, VAT rates, and identifiers. */
export function normalizeRawExtraction(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  const next: Record<string, unknown> = { ...raw };
  if (typeof next.documentType === "string") {
    next.documentType = next.documentType.trim().toLowerCase();
  }
  for (const key of ROOT_SOURCED) {
    if (key in next) {
      next[key] = normalizeSourced(key, next[key]);
    }
  }
  if ("seller" in next) {
    next.seller = normalizeParty(next.seller);
  }
  if ("buyer" in next) {
    next.buyer = normalizeParty(next.buyer);
  }
  if (Array.isArray(next.lineItems)) {
    next.lineItems = next.lineItems.map((line) => normalizeLine(line));
  }
  return next;
}
