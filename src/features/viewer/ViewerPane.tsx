import { useI18n } from "../../i18n";
import type { LoadedDoc } from "../../lib/pipeline";

export function ViewerPane({ doc }: { doc: LoadedDoc }) {
  const { copy } = useI18n();
  const kindLabel = doc.kind === "pdf" ? copy.results.pdf : doc.kind === "image" ? copy.results.image : copy.results.sheet;
  const detail =
    doc.pageCount == null ? copy.results.sheet : copy.results.pageCount(doc.pageCount);

  return (
    <section aria-label={copy.results.viewerLabel} className="border border-hairline bg-raised p-6 desk:sticky desk:top-20">
      <p className="font-mono text-xs text-muted">{kindLabel}</p>
      <h2 className="mt-3 break-words font-display text-3xl">{doc.name}</h2>
      <p className="mt-6 font-mono text-sm">{detail}</p>
      <p className="mt-2 text-sm text-muted">{doc.source === "sample" ? copy.results.sample : copy.results.upload}</p>
    </section>
  );
}
