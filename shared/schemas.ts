import { z } from "zod";
import { normalizeRawExtraction } from "./normalize";
import type {
  Currency,
  DocumentType,
  Extraction,
  LineItem,
  Party,
  Sourced,
} from "./types";

const sourcedString = z.object({
  value: z.string().nullable(),
  evidence: z.string().nullable(),
  page: z.number().int().min(1).max(5).nullable(),
});

const sourcedNumber = z.object({
  value: z.number().nullable(),
  evidence: z.string().nullable(),
  page: z.number().int().min(1).max(5).nullable(),
});

const sourcedCurrency = z.object({
  value: z.enum(["UAH", "USD", "EUR"]).nullable(),
  evidence: z.string().nullable(),
  page: z.number().int().min(1).max(5).nullable(),
});

const partySchema = z.object({
  name: sourcedString,
  edrpou: sourcedString,
  ipn: sourcedString,
  iban: sourcedString,
  address: sourcedString,
});

const lineSchema = z.object({
  description: sourcedString,
  unit: sourcedString,
  quantity: sourcedNumber,
  unitPrice: sourcedNumber,
  vatRate: sourcedNumber,
  amount: sourcedNumber,
});

export const modelExtractionSchema = z.object({
  documentType: z.enum(["invoice", "act", "waybill", "unknown"]),
  documentNumber: sourcedString,
  issueDate: sourcedString,
  currency: sourcedCurrency,
  seller: partySchema,
  buyer: partySchema,
  lineItems: z.array(lineSchema),
  subtotal: sourcedNumber,
  vatTotal: sourcedNumber,
  total: sourcedNumber,
  totalInWords: sourcedString,
  paymentPurpose: sourcedString,
});

type AssertEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const extractionSchemaMatches: AssertEqual<
  z.infer<typeof modelExtractionSchema>,
  Extraction
> = true;

const GEMINI_KEYS = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
  "propertyOrdering",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const NESTED_MAPS = new Set(["properties", "$defs"]);

function sanitize(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => sanitize(item));
  }
  if (!isRecord(node)) {
    return node;
  }
  if (Array.isArray(node.type)) {
    const { type, ...rest } = node;
    return sanitize({
      anyOf: type.map((entry) => ({ ...rest, type: entry })),
    });
  }
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (NESTED_MAPS.has(key) && isRecord(value)) {
      const mapped: Record<string, unknown> = {};
      for (const [name, child] of Object.entries(value)) {
        mapped[name] = sanitize(child);
      }
      next[key] = mapped;
      continue;
    }
    if (!GEMINI_KEYS.has(key)) {
      continue;
    }
    next[key] = sanitize(value);
  }
  return next;
}

/** JSON Schema subset accepted by Gemini responseJsonSchema. Zod stays the source of truth. */
export function toGeminiSchema(schema: z.ZodType = modelExtractionSchema): Record<string, unknown> {
  const exported = z.toJSONSchema(schema) as Record<string, unknown>;
  const sanitized = sanitize(exported);
  if (!isRecord(sanitized)) {
    throw new Error("Gemini schema export was empty");
  }
  return sanitized;
}

export function emptySourced<T>(): Sourced<T> {
  return { value: null, evidence: null, page: null };
}

function emptyParty(): Party {
  return {
    name: emptySourced<string>(),
    edrpou: emptySourced<string>(),
    ipn: emptySourced<string>(),
    iban: emptySourced<string>(),
    address: emptySourced<string>(),
  };
}

export function emptyLine(): LineItem {
  return {
    description: emptySourced<string>(),
    unit: emptySourced<string>(),
    quantity: emptySourced<number>(),
    unitPrice: emptySourced<number>(),
    vatRate: emptySourced<number>(),
    amount: emptySourced<number>(),
  };
}

export function emptyExtraction(documentType: DocumentType = "unknown"): Extraction {
  return {
    documentType,
    documentNumber: emptySourced<string>(),
    issueDate: emptySourced<string>(),
    currency: emptySourced<Currency>(),
    seller: emptyParty(),
    buyer: emptyParty(),
    lineItems: [],
    subtotal: emptySourced<number>(),
    vatTotal: emptySourced<number>(),
    total: emptySourced<number>(),
    totalInWords: emptySourced<string>(),
    paymentPurpose: emptySourced<string>(),
  };
}

/** Unknown documents keep the type and drop every field the model may have invented. */
export function applyUnknownPolicy(extraction: Extraction): Extraction {
  if (extraction.documentType !== "unknown") {
    return extraction;
  }
  return emptyExtraction("unknown");
}

export function safeParseExtraction(
  raw: unknown,
): { success: true; data: Extraction } | { success: false; error: z.ZodError } {
  const parsed = modelExtractionSchema.safeParse(normalizeRawExtraction(raw));
  if (!parsed.success) {
    return parsed;
  }
  return { success: true, data: applyUnknownPolicy(parsed.data) };
}
