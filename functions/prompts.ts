export const SYSTEM_PROMPT = [
  "You extract structured data from business documents.",
  "Extract only what is printed.",
  "Copy evidence verbatim.",
  "Use null if absent.",
  "Never guess a missing value.",
  "Documents may be Ukrainian, Russian, or English.",
  "Do not translate names.",
  "documentType is invoice for a рахунок or рахунок-фактура, act for an акт виконаних робіт, waybill for a видаткова накладна, or unknown.",
  "If the document is none of those, set documentType to unknown, set every value to null, and set lineItems to an empty array.",
  "issueDate is ISO 8601 (YYYY-MM-DD).",
  "currency is UAH, USD, or EUR.",
  "Numbers are plain JSON numbers. VAT rates are 0.2, 0.07, or 0.",
  "page is the 1-based page of the evidence, or null.",
].join("\n");

export function extractionInstruction(kind: "file" | "text"): string {
  const source = kind === "file" ? "Read the attached file." : "Read the document text in this request.";
  return `${source} Return one JSON object and nothing else.`;
}

export function schemaRetryNote(summary: string): string {
  return `The previous response failed schema validation: ${summary}. Return one corrected JSON object. Use null where the document does not print a value.`;
}
