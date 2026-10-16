import { Check } from "lucide-react";
import { useI18n } from "../../i18n";
import { LIVE_STEPS, SAMPLE_STEPS, type StepId } from "../../lib/pipeline";

export function ProgressSteps({ mode, active }: { mode: "sample" | "live"; active: StepId }) {
  const { copy } = useI18n();
  const steps: readonly StepId[] = mode === "sample" ? SAMPLE_STEPS : LIVE_STEPS;
  const activeIndex = steps.indexOf(active);

  return (
    <section aria-labelledby="progress-title">
      <h1 id="progress-title" className="type-display">
        {copy.progress.title}
      </h1>
      <ol className="mt-8 grid grid-cols-1 gap-4 desk:grid-cols-4" aria-live="polite">
        {steps.map((step, index) => {
          const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
          return (
            <li
              key={step}
              aria-current={state === "active" ? "step" : undefined}
              className="overflow-hidden rounded-card border border-hairline bg-raised shadow-raised"
            >
              <span className={`block h-0.5 ${state === "pending" ? "bg-hairline" : "bg-accent"}`} />
              <div className="px-4 py-4">
              <p className="font-mono type-meta text-muted">
                {state === "done" ? <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> : null}
                {copy.progress.state[state]}
              </p>
              <h2 className="mt-2 type-title">{copy.progress.steps[step]}</h2>
              <p className="mt-2 type-ui text-muted">{copy.progress.detail[step]}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
