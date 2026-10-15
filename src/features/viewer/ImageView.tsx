import { useEffect, useRef } from "react";
import type { Provenance } from "../results/trace";
import { MissingPhrase } from "./PdfView";

export function ImageView({ file, name, active }: { file: Blob; name: string; active: Provenance | null }) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const url = URL.createObjectURL(file);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <img ref={imgRef} alt={name} className="block h-auto w-full bg-white" />
      {active ? <MissingPhrase evidence={active.evidence} /> : null}
    </div>
  );
}
