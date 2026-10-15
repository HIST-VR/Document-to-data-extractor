const SPACE =
  /[\t\n\r\f\v \u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/u;

export interface TextSpan {
  start: number;
  end: number;
}

/** Collapse whitespace, including NBSP, to single spaces and trim. */
export function collapseWhitespace(value: string): string {
  return collapseWithMap(value).text;
}

export function matchInText(raw: string, evidence: string): TextSpan | null {
  const needle = collapseWhitespace(evidence);
  if (!needle) return null;
  const { text, rawIndex } = collapseWithMap(raw);
  const at = text.indexOf(needle);
  if (at < 0) return null;
  const start = rawIndex[at];
  const last = rawIndex[at + needle.length - 1];
  if (start === undefined || last === undefined) return null;
  return { start, end: last + 1 };
}

function collapseWithMap(value: string): { text: string; rawIndex: number[] } {
  let text = "";
  const rawIndex: number[] = [];
  let pendingSpace = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? "";
    if (SPACE.test(char)) {
      if (text.length > 0) pendingSpace = true;
      continue;
    }
    if (pendingSpace) {
      text += " ";
      rawIndex.push(index - 1);
      pendingSpace = false;
    }
    text += char;
    rawIndex.push(index);
  }
  return { text, rawIndex };
}

export function markEvidence(container: HTMLElement, evidence: string): boolean {
  clearMarks(container);
  const nodes: { node: Text; start: number }[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let raw = "";
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!(node instanceof Text) || node.data.length === 0) continue;
    nodes.push({ node, start: raw.length });
    raw += node.data;
  }
  const hit = matchInText(raw, evidence);
  if (!hit) return false;
  const slices: { node: Text; start: number; end: number }[] = [];
  for (const entry of nodes) {
    const spanEnd = entry.start + entry.node.data.length;
    const from = Math.max(hit.start, entry.start);
    const to = Math.min(hit.end, spanEnd);
    if (from < to) slices.push({ node: entry.node, start: from - entry.start, end: to - entry.start });
  }
  for (let index = slices.length - 1; index >= 0; index -= 1) {
    const slice = slices[index];
    if (!slice) continue;
    const range = document.createRange();
    range.setStart(slice.node, slice.start);
    range.setEnd(slice.node, slice.end);
    const mark = document.createElement("span");
    mark.className = "doclens-hit";
    range.surroundContents(mark);
  }
  return slices.length > 0;
}

export function clearMarks(container: HTMLElement): void {
  for (const mark of container.querySelectorAll("span.doclens-hit")) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  }
}
