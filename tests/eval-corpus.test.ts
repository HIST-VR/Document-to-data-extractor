import { describe, expect, it } from "vitest";
import { callWithBackoff } from "../scripts/eval/backoff.mjs";
import { buildCorpus, EVAL_NOW } from "../scripts/eval/corpus.mjs";
import { catchPlanted, compareFields } from "../scripts/eval/score.mjs";
import { checkEdrpou, checkIban, checkIpn } from "../shared/identifiers";
import { compareAmountInWords } from "../shared/money-words";
import { validateExtraction } from "../shared/validate";

const NOW = new Date(EVAL_NOW);

describe("eval corpus", () => {
  const corpus = buildCorpus();

  it("builds 12 distinct fictional documents", () => {
    expect(corpus).toHaveLength(12);
    expect(new Set(corpus.map((doc) => doc.id)).size).toBe(12);
    expect(corpus.filter((doc) => doc.mimeType === "image/png")).toHaveLength(1);
    expect(corpus.filter((doc) => doc.pages === 2)).toHaveLength(1);
  });

  it("accepts every printed identifier and amount phrase", () => {
    for (const doc of corpus) {
      for (const party of [doc.extraction.seller, doc.extraction.buyer]) {
        if (party.edrpou.value) expect(checkEdrpou(party.edrpou.value).ok, doc.id).toBe(true);
        if (party.ipn.value) expect(checkIpn(party.ipn.value).ok, doc.id).toBe(true);
        if (party.iban.value) expect(checkIban(party.iban.value).ok, doc.id).toBe(true);
      }
      expect(compareAmountInWords(doc.extraction.totalInWords.value ?? "", doc.extraction.total.value ?? NaN), doc.id).toBe(
        "match",
      );
    }
  });

  it("prints every evidence string and omits a missing IBAN", () => {
    for (const doc of corpus) {
      const walk = (value: unknown): void => {
        if (!value || typeof value !== "object") return;
        if ("evidence" in value && typeof (value as { evidence: unknown }).evidence === "string") {
          expect(doc.html.includes((value as { evidence: string }).evidence), doc.id).toBe(true);
        }
        for (const child of Object.values(value)) {
          if (Array.isArray(child)) child.forEach(walk);
          else walk(child);
        }
      };
      walk(doc.extraction);
      const ibans = [doc.extraction.seller.iban.value, doc.extraction.buyer.iban.value];
      if (ibans.every((value) => value == null)) {
        expect(doc.html.includes("IBAN"), doc.id).toBe(false);
      }
    }
  });

  it("passes validation except the planted arithmetic error", () => {
    let planted = 0;
    let caught = 0;
    for (const doc of corpus) {
      const report = validateExtraction(doc.extraction, NOW);
      const result = catchPlanted(report.checks, doc.planted);
      planted += result.total;
      caught += result.caught;
      if (doc.planted.length === 0) {
        expect(report.errorCount, doc.id).toBe(0);
        expect(report.passed, doc.id).toBe(report.total);
      } else {
        expect(report.errorCount, doc.id).toBe(1);
        expect(result.caught, doc.id).toBe(1);
      }
    }
    expect(planted).toBe(1);
    expect(caught).toBe(1);
  });
});

describe("eval scoring", () => {
  it("counts a changed value and an extra line as misses", () => {
    const [first] = buildCorpus();
    if (!first) throw new Error("missing corpus");
    const actual = structuredClone(first.extraction);
    actual.documentNumber = { ...actual.documentNumber, value: "OTHER" };
    actual.lineItems.push(structuredClone(actual.lineItems[0]!));
    const compared = compareFields(first.extraction, actual);
    expect(compared.missed).toContain("documentNumber");
    expect(compared.missed).toContain("lineItems.length");
    expect(compared.matched).toBeLessThan(compared.total);
  });

  it("retries quota twice and then gives up", async () => {
    const waits: number[] = [];
    let calls = 0;
    await expect(
      callWithBackoff(async () => {
        calls += 1;
        throw { code: "quota" };
      }, async (ms) => {
        waits.push(ms);
      }),
    ).rejects.toEqual({ code: "quota" });
    expect(calls).toBe(3);
    expect(waits).toEqual([20_000, 40_000]);
  });

  it("does not retry a schema failure", async () => {
    let calls = 0;
    await expect(
      callWithBackoff(async () => {
        calls += 1;
        throw { code: "schema" };
      }, async () => {}),
    ).rejects.toEqual({ code: "schema" });
    expect(calls).toBe(1);
  });
});
