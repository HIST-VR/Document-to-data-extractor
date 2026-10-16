import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { Button } from "../../components/ui/Button";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function DropZone({
  fileName,
  fileSize,
  reading,
  fileError,
  onFile,
  onClear,
}: {
  fileName: string | null;
  fileSize: number | null;
  reading: boolean;
  fileError: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const { copy } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    function prevent(event: DragEvent) {
      event.preventDefault();
    }
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  function take(file: File | undefined) {
    if (file) onFile(file);
    if (input.current) input.current.value = "";
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(event.dataTransfer.files[0]);
      }}
      className={`surface-card px-6 py-8 ${over ? "border-accent" : ""}`}
    >
      <h2 className="type-display">{copy.drop.title}</h2>
      <p id="drop-hint" className="mt-3 max-w-xl type-ui text-muted">
        {copy.drop.hint}
      </p>
      {fileName ? (
        <p className="mt-6 font-mono type-ui">
          {fileName}
          {fileSize != null ? <span className="text-muted"> · {formatBytes(fileSize)}</span> : null}
        </p>
      ) : null}
      {reading ? (
        <div className="mt-4" aria-live="polite">
          <span className="block h-5 w-48 rounded-control bg-hairline" />
          <p className="mt-2 type-ui">{copy.drop.reading}</p>
        </div>
      ) : null}
      {fileError ? (
        <p role="alert" className="mt-4 type-ui">
          {fileError}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => input.current?.click()} aria-describedby="drop-hint">
          {fileName ? copy.drop.replace : copy.drop.choose}
        </Button>
        {fileName ? <Button onClick={onClear}>{copy.drop.clear}</Button> : null}
      </div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        tabIndex={-1}
        aria-hidden="true"
        accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx"
        onChange={(event) => take(event.target.files?.[0])}
      />
    </div>
  );
}
