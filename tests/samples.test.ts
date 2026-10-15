import { describe, expect, it } from "vitest";
import { safeParseExtraction } from "../shared/schemas";
import { validateExtraction } from "../shared/validate";
import { loadSample, type SampleId } from "../src/lib/pipeline";
import act from "../public/samples/act.json" with { type: "json" };
import exported from "../public/samples/export.json" with { type: "json" };
import invoice from "../public/samples/invoice.json" with { type: "json" };
import waybill from "../public/samples/waybill.json" with { type: "json" };
import csv from "../public/samples/export.csv?raw";

const NOW = new Date("2026-10-16T12:00:00Z");

const DOCUMENTS = [
  ["invoice", invoice],
  ["act", act],
  ["waybill", waybill],
  ["export", exported],
] as const;

describe("bundled samples", () => {
  it("validates each fictional document with every check passed", () => {
    for (const [name, document] of DOCUMENTS) {
      const parsed = safeParseExtraction(document);
      expect(parsed.success, name).toBe(true);
      if (!parsed.success) continue;
      const report = validateExtraction(parsed.data, NOW);
      expect(report.unsupported, name).toBe(false);
      expect(report.errorCount, name).toBe(0);
      expect(report.passed, name).toBe(report.total);
      expect(report.total, name).toBeGreaterThan(0);
    }
  });

  it("prints every export evidence string in the csv", () => {
    const parsed = safeParseExtraction(exported);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    for (const check of validateExtraction(parsed.data, NOW).checks) {
      expect(check.status).toBe("ok");
    }
    expect(csv).toContain("ЕКС-15");
    expect(csv).toContain("Триста шістдесят гривень 00 копійок");
    expect(csv).toContain("38472917");
    expect(csv).toContain("UA903220010000002600987654321");
  });
});

describe("loadSample", () => {
  it("reads the static files and does not call extract", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith(".json")) {
        return new Response(JSON.stringify(invoice), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response("pdf-bytes", { status: 200 });
    }) as typeof fetch;

    const result = await loadSample("invoice" satisfies SampleId, fetchImpl);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc.extraction.documentNumber.value).toBe("СД-1042");
    expect(calls).toEqual(["/samples/invoice.pdf", "/samples/invoice.json"]);
    expect(calls.some((url) => url.includes("/api/extract"))).toBe(false);
  });
});
