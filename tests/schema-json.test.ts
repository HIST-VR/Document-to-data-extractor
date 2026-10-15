import { describe, expect, it } from "vitest";
import { emptyExtraction, modelExtractionSchema, safeParseExtraction, toGeminiSchema } from "../shared/schemas";
import { invoice } from "./fixture";

const ALLOWED = new Set([
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

function unsupportedKeywords(node: unknown, insideMap = false): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((item) => unsupportedKeywords(item));
  }
  if (!node || typeof node !== "object") {
    return [];
  }
  const found: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (insideMap) {
      found.push(...unsupportedKeywords(value));
      continue;
    }
    if (!ALLOWED.has(key)) {
      found.push(key);
    }
    const nestedMap = key === "properties" || key === "$defs";
    found.push(...unsupportedKeywords(value, nestedMap));
  }
  return found;
}

describe("Gemini JSON Schema", () => {
  it("keeps only keywords Gemini accepts and still describes the document", () => {
    const schema = toGeminiSchema();
    expect(unsupportedKeywords(schema)).toEqual([]);
    expect(JSON.stringify(schema)).toContain("invoice");
    const properties = schema.properties as Record<string, unknown>;
    expect(properties.documentType).toBeTruthy();
    expect(schema).not.toHaveProperty("$schema");
  });

  it("can export a nested piece of the same schema", () => {
    const line = toGeminiSchema(modelExtractionSchema.shape.lineItems);
    expect(line.type === "array" || line.anyOf || line.items || line.$ref).toBeTruthy();
  });
});

describe("safeParseExtraction", () => {
  it("normalizes a localized payload into the extraction", () => {
    const parsed = safeParseExtraction({
      ...invoice(),
      subtotal: { value: "1 234,56", evidence: "1 234,56", page: 1 },
      issueDate: { value: "16.03.2026", evidence: "16.03.2026", page: 1 },
      currency: { value: "uah", evidence: "грн", page: 1 },
      lineItems: [
        {
          ...invoice().lineItems[0],
          vatRate: { value: "20", evidence: "20%", page: 1 },
        },
      ],
      extra: "ignored",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(parsed.data.subtotal.value).toBe(1234.56);
    expect(parsed.data.issueDate.value).toBe("2026-03-16");
    expect(parsed.data.currency.value).toBe("UAH");
    expect(parsed.data.lineItems[0]?.vatRate.value).toBe(0.2);
  });

  it("drops invented fields when the document type is unknown", () => {
    const parsed = safeParseExtraction({
      ...invoice(),
      documentType: "unknown",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(parsed.data).toEqual(emptyExtraction("unknown"));
  });

  it("returns a schema error when the document type is missing", () => {
    const parsed = safeParseExtraction({ seller: { name: "ТОВ" } });
    expect(parsed.success).toBe(false);
  });
});
