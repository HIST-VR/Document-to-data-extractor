import { describe, expect, it } from "vitest";
import { collapseWhitespace, matchInText } from "../src/lib/evidence";

describe("evidence matching", () => {
  it("collapses spaces and NBSP", () => {
    expect(collapseWhitespace("  1\u00A0234,\u202F56  ")).toBe("1 234, 56");
    expect(collapseWhitespace("   ")).toBe("");
  });

  it("finds a phrase inside a longer line", () => {
    const hit = matchInText("Дата: 16.03.2026", "16.03.2026");
    expect(hit).toEqual({ start: 6, end: 16 });
  });

  it("treats NBSP and repeated spaces as the same gap", () => {
    const hit = matchInText("Сума 6\u00A0\u00A0000,00", "Сума 6 000,00");
    expect(hit).toEqual({ start: 0, end: "Сума 6\u00A0\u00A0000,00".length });
  });

  it("returns null when the phrase is absent or blank", () => {
    expect(matchInText("Валюта: UAH", "USD")).toBeNull();
    expect(matchInText("Валюта: UAH", "   ")).toBeNull();
    expect(matchInText("", "UAH")).toBeNull();
  });
});
