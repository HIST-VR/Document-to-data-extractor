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
  const detail = stored ? null : doc.pageCount == null ? copy.results.sheet : copy.results.pageCount(doc.pageCount);

  return (
    <section aria-label={copy.results.viewerLabel} className="border border-hairline bg-raised p-6 desk:sticky desk:top-20">
      <p className="font-mono text-xs text-muted">{kindLabel}</p>
      <h2 className="mt-3 break-words font-display text-3xl">{doc.name}</h2>
      {detail ? <p className="mt-6 font-mono text-sm">{detail}</p> : null}
      {stored ? null : (
        <p className="mt-2 text-sm text-muted">{doc.source === "sample" ? copy.results.sample : copy.results.upload}</p>
      )}
      <div className="mt-4 max-h-[70vh] overflow-auto">
        {stored ? <p className="text-sm leading-6">{copy.results.noFile}</p> : null}
        {!stored && doc.kind === "pdf" && doc.file ? <PdfView file={doc.file} active={active} /> : null}
        {!stored && doc.kind === "image" && doc.file ? <ImageView file={doc.file} name={doc.name} active={active} /> : null}
        {!stored && doc.kind === "sheet" ? <TextView text={doc.text ?? ""} active={active} /> : null}
        {!stored && doc.kind !== "sheet" && !doc.file ? <p className="text-sm">{copy.results.unreadable}</p> : null}
      </div>
    </section>
  );
}
