import { useI18n } from "../../i18n";
import type { LoadedDoc } from "../../lib/pipeline";
import type { Provenance } from "../results/trace";
import { ImageView } from "./ImageView";
import { PdfView } from "./PdfView";
import { TextView } from "./TextView";

export function ViewerPane({ doc, active }: { doc: LoadedDoc; active: Provenance | null }) {
  const { copy } = useI18n();
  const stored = doc.source === "history";
  const kindLabel = stored
    ? copy.results.history
    : doc.kind === "pdf"
      ? copy.results.pdf
      : doc.kind === "image"
        ? copy.results.image
        : copy.results.sheet;
  const detail = !stored && doc.pageCount != null ? copy.results.pageCount(doc.pageCount) : null;

  return (
    <section aria-label={copy.results.viewerLabel} className="surface-card p-6">
      <p className="font-mono type-meta text-muted">{kindLabel}</p>
      <h2 className="mt-2 break-words type-title">{doc.name}</h2>
      {detail ? <p className="mt-4 font-mono type-ui tabular-nums">{detail}</p> : null}
      {stored ? null : (
        <p className="mt-1 type-ui text-muted">{doc.source === "sample" ? copy.results.sample : copy.results.upload}</p>
      )}
      <div className="mt-4">
        {stored ? <p className="type-ui">{copy.results.noFile}</p> : null}
        {!stored && doc.kind === "pdf" && doc.file ? <PdfView file={doc.file} active={active} /> : null}
        {!stored && doc.kind === "image" && doc.file ? <ImageView file={doc.file} name={doc.name} active={active} /> : null}
        {!stored && doc.kind === "sheet" ? <TextView text={doc.text ?? ""} active={active} /> : null}
        {!stored && doc.kind !== "sheet" && !doc.file ? <p className="type-ui">{copy.results.unreadable}</p> : null}
      </div>
    </section>
  );
}
