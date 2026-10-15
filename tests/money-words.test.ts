import { describe, expect, it } from "vitest";
import { compareAmountInWords, parseAmountInWords } from "../shared/money-words";

describe("parseAmountInWords", () => {
  it("reads Ukrainian invoice phrases", () => {
    expect(parseAmountInWords("Одна тисяча двісті тридцять чотири гривні 56 копійок")).toBe(1234.56);
    expect(parseAmountInWords("Двісті сорок гривень 00 копійок")).toBe(240);
    expect(parseAmountInWords("Сто двадцять грн. 00 коп.")).toBe(120);
    expect(parseAmountInWords("Дві тисячі гривень")).toBe(2000);
    expect(parseAmountInWords("Тисяча")).toBe(1000);
    expect(parseAmountInWords("Один мільйон гривень")).toBe(1_000_000);
    expect(parseAmountInWords("нуль гривень 00 копійок")).toBe(0);
    expect(parseAmountInWords("пʼять гривень")).toBe(5);
    expect(parseAmountInWords("Всього: Одна гривня")).toBe(1);
    expect(parseAmountInWords("сто гривень п'ятдесят шість копійок")).toBe(100.56);
  });

  it("reads Russian, English, and digit amounts", () => {
    expect(parseAmountInWords("одна тысяча двести")).toBe(1200);
    expect(parseAmountInWords("two hundred thirty-four dollars")).toBe(234);
    expect(parseAmountInWords("a thousand")).toBe(1000);
    expect(parseAmountInWords("1 234,56 грн")).toBe(1234.56);
    expect(parseAmountInWords("1 234 567")).toBe(1234567);
    expect(parseAmountInWords("1234.56")).toBe(1234.56);
    expect(parseAmountInWords("56 копійок")).toBe(0.56);
  });

  it("refuses phrases outside the closed set", () => {
    expect(parseAmountInWords("")).toBeNull();
    expect(parseAmountInWords("   ")).toBeNull();
    expect(parseAmountInWords("всього")).toBeNull();
    expect(parseAmountInWords("синій олівець")).toBeNull();
    expect(parseAmountInWords("сто сто")).toBeNull();
    expect(parseAmountInWords("три чотири")).toBeNull();
    expect(parseAmountInWords("дванадцять один")).toBeNull();
    expect(parseAmountInWords("zero hundred")).toBeNull();
    expect(parseAmountInWords("twenty hundred")).toBeNull();
    expect(parseAmountInWords("hundred hundred")).toBeNull();
    expect(parseAmountInWords("тисяча тисяча")).toBeNull();
    expect(parseAmountInWords("мільйон мільйон")).toBeNull();
    expect(parseAmountInWords("тисяча мільйон")).toBeNull();
    expect(parseAmountInWords("1 тисяча")).toBeNull();
    expect(parseAmountInWords("12 34")).toBeNull();
    expect(parseAmountInWords("гривень копійок")).toBeNull();
    expect(parseAmountInWords("сто копійок")).toBeNull();
    expect(parseAmountInWords("п'ять гривень сто копійок")).toBeNull();
  });
});

describe("compareAmountInWords", () => {
  it("matches, mismatches, and leaves unknown phrases unchecked", () => {
    expect(compareAmountInWords("Двісті сорок гривень 00 копійок", 240)).toBe("match");
    expect(compareAmountInWords("Двісті сорок гривень 00 копійок", 241)).toBe("mismatch");
    expect(compareAmountInWords("синій олівець", 240)).toBe("unchecked");
  });
});
