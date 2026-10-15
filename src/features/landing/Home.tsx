import { VALIDATION_RULES } from "../../../shared/validate";
import { Button } from "../../components/ui/Button";
import { useI18n } from "../../i18n";
import type { PublicConfig, SampleId } from "../../lib/pipeline";
import { HistoryPanel } from "../history/HistoryPanel";
import type { HistoryRecord } from "../../lib/history";
import { DropZone } from "../upload/DropZone";
import { SampleChips } from "../upload/SampleChips";
import { TurnstileBox } from "../upload/TurnstileBox";

export function Home({
  config,
  fileName,
  fileSize,
  pageCount,
  reading,
  fileError,
  message,
  consented,
  token,
  canExtract,
  onFile,
  onClear,
  onExtract,
  onSample,
  onOpenHistory,
  onToken,
  onRequestConsent,
}: {
  config: PublicConfig | null;
  fileName: string | null;
  fileSize: number | null;
  pageCount: number | null;
  reading: boolean;
  fileError: string | null;
  message: string | null;
  consented: boolean;
  token: string | null;
  canExtract: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onExtract: () => void;
  onSample: (id: SampleId) => void;
  onOpenHistory: (record: HistoryRecord) => void;
  onToken: (token: string | null) => void;
  onRequestConsent: () => void;
}) {
  const { lang, copy } = useI18n();
  const liveReady = config?.status === "ready" && config.turnstileSiteKey !== "";
  const needsConsent = config?.dataTerms === "free" && !consented;

  return (
    <div>
      <h1 className="max-w-3xl font-display text-4xl leading-tight sm:text-5xl">{copy.hero.title}</h1>
      {message ? (
        <p role="alert" className="mt-6 border border-hairline bg-raised px-4 py-3 text-sm leading-6">
          {message}
        </p>
      ) : null}
      <div className="mt-10">
        <DropZone fileName={fileName} fileSize={fileSize} reading={reading} fileError={fileError} onFile={onFile} onClear={onClear} />
      </div>
      {fileName && !reading ? (
        <div className="mt-6 border border-hairline bg-raised px-4 py-4">
          <p className="text-sm">
            {copy.drop.ready}
            {pageCount != null ? <span className="text-muted"> · {copy.results.pageCount(pageCount)}</span> : null}
          </p>
          {config == null ? (
            <div className="mt-4" aria-live="polite">
              <span className="block h-3 w-48 bg-hairline" />
              <p className="mt-2 text-sm">{copy.pipeline.checking}</p>
            </div>
          ) : null}
          {config && !liveReady ? <p className="mt-4 text-sm leading-6">{copy.pipeline.unavailable}</p> : null}
          {liveReady && needsConsent ? (
            <div className="mt-4">
              <Button variant="primary" onClick={onRequestConsent}>
                {copy.turnstile.needConsent}
              </Button>
            </div>
          ) : null}
          {liveReady && !needsConsent && config ? (
            <div className="mt-4">
              <p className="text-sm text-muted">{copy.turnstile.label}</p>
              <div className="mt-3">
                <TurnstileBox siteKey={config.turnstileSiteKey} onToken={onToken} />
              </div>
              <div className="mt-4">
                <Button variant="primary" disabled={!canExtract || !token} onClick={onExtract}>
                  {copy.turnstile.extract}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <SampleChips onSample={onSample} />
      <HistoryPanel onOpen={onOpenHistory} />
      <section className="mt-16 border-t border-hairline pt-10" aria-labelledby="how-title">
        <h2 id="how-title" className="font-display text-3xl">
          {copy.how.title}
        </h2>
        <ol className="mt-6 grid grid-cols-1 gap-6 desk:grid-cols-4">
          {copy.how.steps.map((step, index) => (
            <li key={step.id}>
              <p className="font-mono text-xs text-muted">0{index + 1}</p>
              <h3 className="mt-2 font-display text-2xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-16 border-t border-hairline pt-10" aria-labelledby="rules-title">
        <h2 id="rules-title" className="font-display text-3xl">
          {copy.rules.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{copy.rules.intro}</p>
        <ul className="mt-6 grid grid-cols-1 gap-x-10 gap-y-5 desk:grid-cols-2">
          {VALIDATION_RULES.map((rule) => (
            <li key={rule.id} className="border-t border-hairline pt-4">
              <p className="font-mono text-xs text-muted">{rule.id}</p>
              <p className="mt-2 text-sm leading-6">{lang === "uk" ? rule.uk : rule.en}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
