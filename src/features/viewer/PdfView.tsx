import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { clearMarks, markEvidence, matchInText } from "../../lib/evidence";
import { loadPdfjs } from "../../lib/pdfjs";
import { useI18n } from "../../i18n";
import type { Provenance } from "../results/trace";

interface PageText {
  page: number;
  text: string;
}

export function PdfView({ file, active }: { file: Blob; active: Provenance | null }) {
  const { copy } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pages, setPages] = useState<PageText[]>([]);
  const [drawn, setDrawn] = useState(0);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const [seenFile, setSeenFile] = useState(file);
  if (file !== seenFile) {
    setSeenFile(file);
    setStatus("loading");
    setPages([]);
    setDrawn(0);
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth((current) => (Math.abs(current - next) < 1 ? current : Math.floor(next)));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let destroyed = false;
    const pending = loadPdfjs().then(async (pdfjs) => {
      const data = new Uint8Array(await file.arrayBuffer());
      const task = pdfjs.getDocument({ data });
      const document = await task.promise;
      return { task, document };
    });
    function close(task: { destroy: () => Promise<void> }) {
      if (destroyed) return;
      destroyed = true;
      void task.destroy();
    }
    void pending
      .then(({ task, document }) => {
        if (cancelled) {
          close(task);
          return;
        }
        documentRef.current = document;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      documentRef.current = null;
      void pending.then(({ task }) => close(task)).catch(() => {});
    };
  }, [file]);

  useEffect(() => {
    const host = hostRef.current;
    const document = documentRef.current;
    if (!host || !document || width < 16 || status !== "ready") return;
    const root = host;
    let cancelled = false;
    const renders: { cancel: () => void }[] = [];
    const layers: { cancel: () => void }[] = [];

    async function draw() {
      const pdfjs = await loadPdfjs();
      if (cancelled || !document) return;
      const holder = window.document.createElement("div");
      const found: PageText[] = [];
      for (let number = 1; number <= document.numPages; number += 1) {
        if (cancelled) return;
        const page = await document.getPage(number);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / base.width });
        const wrap = window.document.createElement("div");
        wrap.dataset.page = String(number);
        wrap.className = "relative mb-3 bg-white";
        wrap.style.width = `${viewport.width}px`;
        wrap.style.height = `${viewport.height}px`;
        wrap.style.setProperty("--total-scale-factor", "1");
        const canvas = window.document.createElement("canvas");
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.setAttribute("aria-hidden", "true");
        const textLayer = window.document.createElement("div");
        textLayer.className = "textLayer";
        wrap.append(canvas, textLayer);
        holder.append(wrap);
        const renderTask = page.render({
          canvas,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        renders.push(renderTask);
        const content = await page.getTextContent();
        let text = "";
        for (const item of content.items) {
          if ("str" in item && typeof item.str === "string") text += item.str;
        }
        found.push({ page: number, text });
        const layer = new pdfjs.TextLayer({ textContentSource: content, container: textLayer, viewport });
        layers.push(layer);
        await Promise.all([renderTask.promise, layer.render()]);
      }
      if (cancelled) return;
      root.replaceChildren(...holder.childNodes);
      setPages(found);
      setDrawn((value) => value + 1);
    }

    void draw().catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => {
      cancelled = true;
      for (const task of renders) task.cancel();
      for (const layer of layers) layer.cancel();
    };
  }, [status, width, file]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || drawn === 0) return;
    for (const layer of host.querySelectorAll(".textLayer")) {
      if (layer instanceof HTMLElement) clearMarks(layer);
    }
    if (!active) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const targets = active.page == null
      ? [...host.querySelectorAll(".textLayer")]
      : [host.querySelector(`[data-page="${active.page}"] .textLayer`)];
    for (const layer of targets) {
      if (!(layer instanceof HTMLElement)) continue;
      if (!markEvidence(layer, active.evidence)) continue;
      layer.querySelector(".doclens-hit")?.scrollIntoView({ block: "nearest", behavior });
      return;
    }
    if (active.page != null) {
      host.querySelector(`[data-page="${active.page}"]`)?.scrollIntoView({ block: "nearest", behavior });
    }
  }, [active, drawn]);

  const missing = Boolean(
    active &&
      pages.length > 0 &&
      !pages.some((page) => (active.page == null || page.page === active.page) && matchInText(page.text, active.evidence)),
  );

  return (
    <div>
      {status === "loading" ? <div className="h-64 animate-pulse bg-hairline" aria-hidden="true" /> : null}
      <div ref={hostRef} />
      {status === "loading" ? <p className="mt-2 type-ui text-muted">{copy.results.loading}</p> : null}
      {status === "error" ? <p role="alert" className="type-ui">{copy.results.unreadable}</p> : null}
      {missing && active ? <MissingPhrase evidence={active.evidence} /> : null}
    </div>
  );
}

export function MissingPhrase({ evidence }: { evidence: string }) {
  const { copy } = useI18n();
  return (
    <p className="mt-4 type-ui">
      {copy.results.notInText}
      <span className="mt-1 block font-mono type-meta text-muted">
        {copy.fields.printed}: {evidence}
      </span>
    </p>
  );
}
