import { matchInText } from "./evidence";

export interface PdfTextItem {
  str: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
}

export interface PdfFontStyle {
  ascent?: number;
  descent?: number;
}

export interface PdfGlyph {
  unicode?: string;
  width?: number;
}

export interface HighlightBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PdfPageBox {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
}

interface Step {
  ch: string;
  width: number;
}

/** Glyph runs from each `showText` operator, in paint order. */
export function showTextRuns(fnArray: number[], argsArray: unknown[], showText: number): Array<Array<PdfGlyph | number>> {
  const runs: Array<Array<PdfGlyph | number>> = [];
  for (let index = 0; index < fnArray.length; index += 1) {
    if (fnArray[index] !== showText) continue;
    const arg = argsArray[index];
    if (!Array.isArray(arg)) continue;
    const glyphs = Array.isArray(arg[0]) ? arg[0] : arg;
    if (Array.isArray(glyphs)) runs.push(glyphs as Array<PdfGlyph | number>);
  }
  return runs;
}

function flatten(runs: Array<Array<PdfGlyph | number>>): Step[] {
  const steps: Step[] = [];
  let pending = 0;
  for (const run of runs) {
    for (const glyph of run) {
      if (typeof glyph === "number") {
        pending += glyph;
        continue;
      }
      const ch = glyph.unicode ?? "";
      const width = (glyph.width ?? 0) + pending;
      pending = 0;
      if (ch.length === 0) {
        pending += width;
        continue;
      }
      const share = width / ch.length;
      for (let index = 0; index < ch.length; index += 1) {
        steps.push({ ch: ch[index] ?? "", width: share });
      }
    }
  }
  return steps;
}

/**
 * Boxes are fractions of the page. The text layer paints a fallback font and
 * then applies one scaleX to the whole line, so a background on a mid-line
 * phrase follows that font instead of the PDF glyphs.
 */
export function highlightBoxes(
  items: PdfTextItem[],
  styles: Record<string, PdfFontStyle>,
  runs: Array<Array<PdfGlyph | number>>,
  evidence: string,
  page: PdfPageBox,
): HighlightBox[] | null {
  if (page.width <= 0 || page.height <= 0) return null;
  const steps = flatten(runs);
  const raw = items.map((item) => item.str).join("");
  if (steps.map((step) => step.ch).join("") !== raw) return null;
  const hit = matchInText(raw, evidence);
  if (!hit) return null;

  const originX = page.offsetX ?? 0;
  const originY = page.offsetY ?? 0;
  const boxes: HighlightBox[] = [];
  let cursor = 0;
  for (const item of items) {
    const count = item.str.length;
    const slice = steps.slice(cursor, cursor + count);
    const itemStart = cursor;
    cursor += count;
    if (slice.length !== count) return null;
    const from = Math.max(hit.start, itemStart);
    const to = Math.min(hit.end, itemStart + count);
    if (from >= to) continue;

    const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = item.transform;
    if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01 || a < 0) return null;
    const rawSum = slice.reduce((total, step) => total + step.width, 0);
    const scale = rawSum > 0 ? item.width / rawSum : 0;
    let x = e;
    for (let index = 0; index < from - itemStart; index += 1) {
      x += (slice[index]?.width ?? 0) * scale;
    }
    let width = 0;
    for (let index = from - itemStart; index < to - itemStart; index += 1) {
      width += (slice[index]?.width ?? 0) * scale;
    }
    const fontSize = Math.hypot(a, d) || item.height;
    const style = styles[item.fontName];
    const ascent = style?.ascent ?? 0.8;
    const descent = style?.descent ?? -0.2;
    const topPdf = f + ascent * fontSize;
    const heightPdf = (ascent - descent) * fontSize;
    boxes.push({
      left: (x - originX) / page.width,
      top: (originY + page.height - topPdf) / page.height,
      width: width / page.width,
      height: heightPdf / page.height,
    });
  }
  return boxes;
}
