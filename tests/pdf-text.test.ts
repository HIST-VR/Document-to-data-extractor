import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { matchInText } from "../src/lib/evidence";
import act from "../public/samples/act.json" with { type: "json" };
import invoice from "../public/samples/invoice.json" with { type: "json" };
import waybill from "../public/samples/waybill.json" with { type: "json" };
import exported from "../public/samples/export.json" with { type: "json" };

interface Sourced {
  evidence?: string | null;
  page?: number | null;
}

function collect(value: unknown, out: Sourced[] = []): Sourced[] {
  if (!value || typeof value !== "object") return out;
  if ("evidence" in value) out.push(value as Sourced);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach((item) => collect(item, out));
    else collect(child, out);
  }
  return out;
}

async function pageText(path: string): Promise<string[]> {
  const data = new Uint8Array(readFileSync(path));
  const task = getDocument(Object.assign({ data }, { disableWorker: true }));
  try {
    const document = await task.promise;
    const pages: string[] = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if ("str" in item && typeof item.str === "string") text += item.str;
      }
      pages.push(text);
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

describe("sample documents", () => {
  it.each([
    ["invoice", invoice],
    ["act", act],
    ["waybill", waybill],
  ] as const)("finds every %s evidence phrase in the text layer", async (id, json) => {
    const pages = await pageText(`public/samples/${id}.pdf`);
    const phrases = collect(json).filter((field) => field.evidence);
    expect(phrases.length).toBeGreaterThan(10);
    for (const field of phrases) {
      const evidence = field.evidence ?? "";
      const chosen = field.page == null ? pages : [pages[(field.page ?? 1) - 1] ?? ""];
      expect(chosen.some((text) => matchInText(text, evidence))).toBe(true);
    }
    expect(matchInText(pages.join("\n"), "this phrase is not printed")).toBeNull();
  });

  it("finds every 1C export phrase in the spreadsheet text", () => {
    const text = readFileSync("public/samples/export.csv", "utf8");
    const phrases = collect(exported).filter((field) => field.evidence);
    expect(phrases.length).toBeGreaterThan(5);
    for (const field of phrases) {
      expect(matchInText(text, field.evidence ?? "")).not.toBeNull();
    }
  });
});
