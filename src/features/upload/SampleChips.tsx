import { useI18n } from "../../i18n";
import type { SampleId } from "../../lib/pipeline";

const CHIPS: Array<{ id: SampleId; number: string; label: "invoice" | "act" | "waybill" | "export" }> = [
  { id: "invoice", number: "СД-1042", label: "invoice" },
  { id: "act", number: "АВ-77", label: "act" },
  { id: "waybill", number: "ВН-318", label: "waybill" },
  { id: "export", number: "ЕКС-15", label: "export" },
];

export function SampleChips({ onSample }: { onSample: (id: SampleId) => void }) {
  const { copy } = useI18n();
  return (
    <section className="mt-10" aria-labelledby="samples-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="samples-title" className="font-display text-3xl">
          {copy.samples.title}
        </h2>
        <p className="max-w-md text-sm text-muted">{copy.samples.hint}</p>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 desk:grid-cols-4">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSample(chip.id)}
            className="flex min-h-11 flex-col items-start border border-hairline bg-raised px-4 py-3 text-left hover:border-ink"
          >
            <span className="font-display text-2xl">{chip.number}</span>
            <span className="mt-1 font-mono text-xs text-muted">{copy.samples[chip.label]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
