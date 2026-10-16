import { readFileSync } from "node:fs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { highlightBoxes, showTextRuns, type PdfTextItem } from "../src/lib/pdf-highlight";

const page = { width: 1000, height: 1000 };

function item(str: string, width: number, x = 48): PdfTextItem {
  return { str, width, height: 11, transform: [11, 0, 0, 11, x, 618], fontName: "f" };
}

describe("highlightBoxes", () => {
  it("starts a mid-line phrase at the PDF glyph advance, not at a character fraction", () => {
    const str = "Адреса: вул";
    const widths = [10, 10, 10, 10, 10, 10, 10, 10, 30, 30, 30];
    const text = item(str, 100);
    const runs = [widths.map((width, index) => ({ unicode: str[index], width }))];
    const boxes = highlightBoxes([text], { f: { ascent: 1, descent: 0 } }, runs, "вул", page);
    const prefix = (80 / 170) * 100;
    expect(boxes).not.toBeNull();
    expect(boxes?.[0]?.left).toBeCloseTo((48 + prefix) / 1000, 5);
    expect(boxes?.[0]?.width).toBeCloseTo((90 / 170) * 100 / 1000, 5);
    const byCount = (48 + (8 / 11) * 100) / 1000;
    expect(Math.abs((boxes?.[0]?.left ?? 0) - byCount)).toBeGreaterThan(0.01);
  });

  it("keeps a phrase that begins the line on the line origin", () => {
    const str = "РАХУНОК";
    const runs = [[...str].map((unicode) => ({ unicode, width: 600 }))];
    const boxes = highlightBoxes([item(str, 42)], { f: { ascent: 0.8, descent: -0.2 } }, runs, str, page);
    expect(boxes?.[0]?.left).toBeCloseTo(48 / 1000, 5);
    expect(boxes?.[0]?.width).toBeCloseTo(42 / 1000, 5);
  });

  it("returns null when the glyph stream does not match the text items", () => {
    const text = item("Адреса", 40);
    const runs = [[{ unicode: "Інше", width: 10 }]];
    expect(highlightBoxes([text], {}, runs, "Адреса", page)).toBeNull();
  });
});

describe("sample invoice highlight", () => {
  it("places the seller address after the label using the embedded glyph widths", async () => {
    const data = new Uint8Array(readFileSync("public/samples/invoice.pdf"));
    const task = getDocument(Object.assign({ data }, { disableWorker: true }));
    try {
      const document = await task.promise;
      const pdfPage = await document.getPage(1);
      const content = await pdfPage.getTextContent();
      const ops = await pdfPage.getOperatorList();
      const viewport = pdfPage.getViewport({ scale: 1 });
      const dims = viewport.rawDims as { pageWidth: number; pageHeight: number; pageX: number; pageY: number };
      const items: PdfTextItem[] = [];
      for (const entry of content.items) {
        if (!("str" in entry) || typeof entry.str !== "string") continue;
        items.push({
          str: entry.str,
          width: entry.width,
          height: entry.height,
          transform: entry.transform,
          fontName: entry.fontName,
        });
      }
      const evidence = "вул. Липова, 12, м. Львів, 79000";
      const boxes = highlightBoxes(
        items,
        content.styles,
        showTextRuns(ops.fnArray, ops.argsArray, OPS.showText),
        evidence,
        { width: dims.pageWidth, height: dims.pageHeight, offsetX: dims.pageX, offsetY: dims.pageY },
      );
      const line = items.find((entry) => entry.str.includes(evidence));
      expect(line).toBeTruthy();
      expect(line?.str.indexOf(evidence)).toBeGreaterThan(0);
      expect(boxes?.[0]?.left).toBeCloseTo((48 + 44.737) / dims.pageWidth, 3);
      expect(boxes?.[0]?.width).toBeCloseTo(166.551 / dims.pageWidth, 3);
    } finally {
      await task.destroy();
    }
  });
});
