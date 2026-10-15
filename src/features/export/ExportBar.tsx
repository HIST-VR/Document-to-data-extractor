import { useEffect, useRef, useState } from "react";
import type { ResultExtraction } from "../../../shared/types";
import { Button } from "../../components/ui/Button";
import { useI18n } from "../../i18n";
import { downloadName, extractionJson, lineItemsCsv, workbookBytes } from "../../lib/export-doc";

function saveFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportBar({ name, extraction }: { name: string; extraction: ResultExtraction }) {
  const { copy } = useI18n();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current);
  }, []);

  async function copyJson() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(extractionJson(extraction));
      setCopied(true);
      if (timer.current != null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <div className="mt-6">
      <h2 className="font-mono text-xs text-muted">{copy.export.title}</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button onClick={() => saveFile(downloadName(name, "json"), new Blob([extractionJson(extraction)], { type: "application/json" }))}>
          {copy.export.json}
        </Button>
        <Button onClick={() => saveFile(downloadName(name, "csv"), new Blob([lineItemsCsv(extraction)], { type: "text/csv;charset=utf-8" }))}>
          {copy.export.csv}
        </Button>
        <Button
          onClick={() => {
            void workbookBytes(extraction).then((bytes) => {
              const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
              saveFile(
                downloadName(name, "xlsx"),
                new Blob([body], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
              );
            });
          }}
        >
          {copy.export.xlsx}
        </Button>
        <Button onClick={() => void copyJson()}>{copied ? copy.export.copied : copy.export.copy}</Button>
      </div>
      {failed ? (
        <p role="alert" className="mt-3 text-sm">{copy.export.failed}</p>
      ) : null}
    </div>
  );
}
