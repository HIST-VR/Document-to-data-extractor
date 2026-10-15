import { useEffect, useRef, useState } from "react";
import { safeParseExtraction } from "../shared/schemas";
import { validateExtraction } from "../shared/validate";
import type { ValidationReport } from "../shared/types";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ConsentDialog } from "./components/ui/ConsentDialog";
import { Home } from "./features/landing/Home";
import { ResultsView } from "./features/results/ResultsView";
import { ProgressSteps } from "./features/upload/ProgressSteps";
import { useI18n } from "./i18n";
import type { Copy } from "./i18n/en";
import { commitDocumentType, commitField } from "./lib/edit";
import { saveExtraction, type HistoryRecord } from "./lib/history";
import { MAX_PDF_PAGES, classifyFile, type FileKind } from "./lib/files";
import {
  extractLive,
  loadConfig,
  loadSample,
  type LoadedDoc,
  type PipelineFailure,
  type PublicConfig,
  type SampleId,
  type StepId,
} from "./lib/pipeline";
import { readConsent, writeConsent } from "./lib/prefs";

interface PendingFile {
  file: File;
  kind: FileKind;
  mime: string;
  pageCount: number | null;
}

type Phase =
  | { name: "home"; message: string | null }
  | { name: "running"; mode: "sample" | "live"; active: StepId }
  | { name: "results"; doc: LoadedDoc; report: ValidationReport };

function failureText(copy: Copy, failure: PipelineFailure): string {
  if (failure.kind === "message") return failure.message;
  if (failure.code === "text-size") return copy.pipeline.textSize;
  if (failure.code === "empty-text") return copy.pipeline.emptyText;
  if (failure.code === "schema") return copy.pipeline.schema;
  return copy.pipeline.network;
}

export function App() {
  return (
    <Shell />
  );
}

function Shell() {
  const { copy } = useI18n();
  const [phase, setPhase] = useState<Phase>({ name: "home", message: null });
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [consented, setConsented] = useState(() => readConsent());
  const [token, setToken] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    void loadConfig().then(setConfig);
  }, []);

  const liveReady = config?.status === "ready" && config.turnstileSiteKey !== "";
  const consentOpen = Boolean(pending && liveReady && config?.dataTerms === "free" && !consented && !consentDismissed);

  function resetHome(message: string | null = null) {
    requestId.current += 1;
    setPending(null);
    setReading(false);
    setFileError(null);
    setToken(null);
    setConsentDismissed(false);
    setPhase({ name: "home", message });
  }

  async function acceptFile(file: File) {
    const id = ++requestId.current;
    setToken(null);
    setFileError(null);
    setConsentDismissed(false);
    const classified = classifyFile(file);
    if (!classified.ok) {
      setPending(null);
      setFileError(copy.fileIssues[classified.issue]);
      return;
    }
    if (classified.kind === "pdf") {
      setReading(true);
      setPending(null);
      try {
        const { countPdfPages } = await import("./lib/pdf-pages");
        const pages = await countPdfPages(await file.arrayBuffer());
        if (requestId.current !== id) return;
        if (pages > MAX_PDF_PAGES) {
          setFileError(copy.fileIssues.pages);
          return;
        }
        setPending({ file, kind: classified.kind, mime: classified.mime, pageCount: pages });
      } catch {
        if (requestId.current !== id) return;
        setFileError(copy.fileIssues.read);
      } finally {
        if (requestId.current === id) setReading(false);
      }
      return;
    }
    setPending({ file, kind: classified.kind, mime: classified.mime, pageCount: null });
  }

  async function openSample(id: SampleId) {
    setPhase({ name: "running", mode: "sample", active: "render" });
    const loaded = await loadSample(id);
    if (!loaded.ok) {
      setPhase({ name: "home", message: failureText(copy, loaded) });
      return;
    }
    setPhase({ name: "running", mode: "sample", active: "validate" });
    setPhase({
      name: "results",
      doc: loaded.doc,
      report: validateExtraction(loaded.doc.extraction),
    });
    void saveExtraction({ name: loaded.doc.name, extraction: loaded.doc.extraction }).catch(() => {});
  }

  function openHistory(record: HistoryRecord) {
    const parsed = safeParseExtraction(record.extraction);
    if (!parsed.success) return;
    setPhase({
      name: "results",
      doc: {
        name: record.name,
        kind: "pdf",
        mime: "application/pdf",
        pageCount: null,
        source: "history",
        extraction: parsed.data,
        file: null,
        text: null,
      },
      report: validateExtraction(parsed.data),
    });
  }

  async function runExtract() {
    if (!pending || !token) return;
    const current = pending;
    setPhase({ name: "running", mode: "live", active: "render" });
    const result = await extractLive({
      file: current.file,
      kind: current.kind,
      mime: current.mime,
      pageCount: current.pageCount,
      token,
      onStep: (active) => setPhase({ name: "running", mode: "live", active }),
    });
    if (!result.ok) {
      setToken(null);
      setPhase({ name: "home", message: failureText(copy, result) });
      return;
    }
    setPhase({
      name: "results",
      doc: result.doc,
      report: validateExtraction(result.doc.extraction),
    });
    void saveExtraction({ name: result.doc.name, extraction: result.doc.extraction }).catch(() => {});
  }

  const terms = config?.status === "ready" ? config.dataTerms : null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface font-sans text-ink antialiased">
      <Header onHome={() => resetHome()} />
      <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-12 sm:px-8">
        {phase.name === "home" ? (
          <Home
            config={config}
            fileName={pending?.file.name ?? null}
            fileSize={pending?.file.size ?? null}
            pageCount={pending?.pageCount ?? null}
            reading={reading}
            fileError={fileError}
            message={phase.message}
            consented={consented}
            token={token}
            canExtract={Boolean(pending) && !reading}
            onFile={(file) => void acceptFile(file)}
            onClear={() => {
              requestId.current += 1;
              setPending(null);
              setReading(false);
              setFileError(null);
              setToken(null);
            }}
            onExtract={() => void runExtract()}
            onSample={(id) => void openSample(id)}
            onOpenHistory={openHistory}
            onToken={setToken}
            onRequestConsent={() => setConsentDismissed(false)}
          />
        ) : null}
        {phase.name === "running" ? <ProgressSteps mode={phase.mode} active={phase.active} /> : null}
        {phase.name === "results" ? (
          <ResultsView
            doc={phase.doc}
            report={phase.report}
            onReset={() => resetHome()}
            onCommit={(path, raw) => {
              if (phase.name !== "results") return;
              const extraction = commitField(phase.doc.extraction, path, raw);
              setPhase({
                name: "results",
                doc: { ...phase.doc, extraction },
                report: validateExtraction(extraction),
              });
            }}
            onType={(value) => {
              if (phase.name !== "results") return;
              const extraction = commitDocumentType(phase.doc.extraction, value);
              setPhase({
                name: "results",
                doc: { ...phase.doc, extraction },
                report: validateExtraction(extraction),
              });
            }}
          />
        ) : null}
      </main>
      <Footer terms={terms} />
      <ConsentDialog
        open={consentOpen}
        onCancel={() => setConsentDismissed(true)}
        onAccept={() => {
          writeConsent();
          setConsented(true);
          setConsentDismissed(true);
        }}
      />
    </div>
  );
}

