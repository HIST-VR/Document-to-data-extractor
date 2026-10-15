import { useState } from "react";
import type { FieldCheck } from "../../../shared/types";
import { useI18n } from "../../i18n";
import { formatFieldValue, parseRaw, type FieldKind } from "../../lib/edit";
import { StatusPill } from "../../components/StatusPill";

const CONTROL =
  "mt-1 w-full border-0 border-b border-hairline bg-transparent py-2 font-mono text-base text-ink tabular-nums";

export function ValueField({
  label,
  path,
  kind,
  value,
  evidence,
  page,
  check,
  onCommit,
}: {
  label: string;
  path: string;
  kind: FieldKind;
  value: string | number | null;
  evidence: string | null;
  page: number | null;
  check: FieldCheck | undefined;
  onCommit: (path: string, raw: string) => void;
}) {
  const { lang, copy } = useI18n();
  const shown = formatFieldValue(kind, value);
  const [draft, setDraft] = useState(shown);
  const [seen, setSeen] = useState(shown);
  const [focused, setFocused] = useState(false);
  const [rejected, setRejected] = useState(false);
  const id = `field-${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
  const multiline =
    kind === "text" &&
    (path.endsWith("address") || path.endsWith("description") || path === "totalInWords" || path === "paymentPurpose");

  if (!focused && seen !== shown) {
    setSeen(shown);
    setDraft(shown);
    setRejected(false);
  }

  function change(raw: string) {
    setDraft(raw);
    const numeric = kind === "number" || kind === "vat";
    if (numeric && raw.trim() !== "" && parseRaw(kind, raw) == null) {
      setRejected(true);
      return;
    }
    setRejected(false);
    onCommit(path, raw);
  }

  const reason = check ? (lang === "uk" ? check.reason.uk : check.reason.en) : null;
  const shared = {
    id,
    value: draft,
    "aria-invalid": rejected || undefined,
    autoComplete: "off" as const,
    spellCheck: kind === "text",
    inputMode: kind === "number" || kind === "vat" ? ("decimal" as const) : undefined,
    autoCapitalize: kind === "id" ? ("characters" as const) : undefined,
    className: `${CONTROL} ${multiline ? "min-h-16" : "h-11"}`,
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      setSeen(shown);
      setDraft(shown);
      setRejected(false);
    },
    onChange: (event: { target: { value: string } }) => change(event.target.value),
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
        {check ? <StatusPill status={check.status} label={copy.status[check.status]} /> : null}
      </div>
      {multiline ? <textarea {...shared} rows={2} /> : <input {...shared} />}
      {rejected ? (
        <p role="alert" className="mt-2 text-sm">
          {copy.results.invalidDraft}
        </p>
      ) : null}
      {reason ? <p className="mt-2 text-sm">{reason}</p> : null}
      {evidence ? (
        <p className="mt-1 font-mono text-xs text-muted">
          {copy.fields.printed}: {evidence}
          {page != null ? (
            <>
              {" · "}
              <span className="sr-only">{copy.fields.page} </span>
              {page}
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
