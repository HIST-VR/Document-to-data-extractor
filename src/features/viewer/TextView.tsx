import { useEffect, useRef } from "react";
import { clearMarks, markEvidence, matchInText } from "../../lib/evidence";
import type { Provenance } from "../results/trace";
import { MissingPhrase } from "./PdfView";

export function TextView({ text, active }: { text: string; active: Provenance | null }) {
  const ref = useRef<HTMLPreElement>(null);
  const missing = Boolean(active && !matchInText(text, active.evidence));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    clearMarks(node);
    node.textContent = text;
    if (!active) return;
    if (!markEvidence(node, active.evidence)) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    node.querySelector(".doclens-hit")?.scrollIntoView({ block: "nearest", behavior });
  }, [text, active]);

  return (
    <div>
      <pre ref={ref} className="whitespace-pre-wrap font-mono text-sm leading-6 text-ink" />
      {missing && active ? <MissingPhrase evidence={active.evidence} /> : null}
    </div>
  );
}
