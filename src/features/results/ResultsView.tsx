import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { checksByPath } from "../../../shared/validate";
import type { DocumentType, Extraction, FieldCheck, Party, Sourced, ValidationReport } from "../../../shared/types";
import { StatusPill } from "../../components/StatusPill";
import { Button } from "../../components/ui/Button";
import { useI18n } from "../../i18n";
import { fieldKind, type FieldKind } from "../../lib/edit";
import type { LoadedDoc } from "../../lib/pipeline";
import { ExportBar } from "../export/ExportBar";
import { ViewerPane } from "../viewer/ViewerPane";
import { TraceContext, useTrace, type Provenance, type TraceEvent, type TraceTarget } from "./trace";
import { FieldNote, ValueField } from "./ValueField";

const PARTY_FIELDS = ["name", "edrpou", "ipn", "iban", "address"] as const;
const LINE_FIELDS = ["description", "unit", "quantity", "unitPrice", "vatRate", "amount"] as const;
const TYPES: DocumentType[] = ["invoice", "act", "waybill", "unknown"];

export function ResultsView({
  doc,
  report,
  onCommit,
  onType,
  onReset,
}: {
  doc: LoadedDoc;
  report: ValidationReport;
  onCommit: (path: string, raw: string) => void;
  onType: (value: string) => void;
  onReset: () => void;
}) {
  const { lang, copy } = useI18n();
  const byPath = useMemo(() => checksByPath(report), [report]);
  const extraction = doc.extraction;
  const unsupported = extraction.documentType === "unknown";
  const [hover, setHover] = useState<TraceTarget | null>(null);
  const [focus, setFocus] = useState<TraceTarget | null>(null);
  const current = hover ?? focus;
  const active: Provenance | null = current?.evidence ? { evidence: current.evidence, page: current.page } : null;

  function trace(event: TraceEvent, target: TraceTarget) {
    if (event === "enter") setHover(target);
    else if (event === "leave") setHover(null);
    else if (event === "focus") setFocus(target);
    else setFocus(null);
  }

  const issues = report.checks.filter((check) => check.status !== "ok");

  function jump(path: string, evidence: string | null, page: number | null) {
    const id = path === "documentType" ? "field-document-type" : `field-${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
    const node = document.getElementById(id);
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.focus({ preventScroll: true });
    node.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    trace("focus", { evidence, page });
  }

  return (
    <TraceContext.Provider value={trace}>
    <div className="flex flex-col desk:min-h-0 desk:flex-1 desk:overflow-hidden">
      <div className="summary-bar">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono type-meta text-muted">{copy.docType[extraction.documentType]}</p>
            <h1 className="mt-1 max-w-3xl type-display" aria-live="polite">
              {unsupported ? copy.results.unsupportedTitle : copy.results.summary(report.passed, report.total)}
            </h1>
          </div>
          <Button onClick={onReset}>{copy.results.fresh}</Button>
        </div>
        {issues.length > 0 ? (
          <ul aria-label={copy.results.issues} className="mt-4 flex max-h-48 flex-col gap-1 overflow-auto">
            {issues.map((check) => (
              <li key={check.path}>
                <button
                  type="button"
                  className="btn flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left hover:bg-raised"
                  onClick={() => {
                    const sourced = readSourced(extraction, check.path);
                    jump(check.path, sourced?.evidence ?? null, sourced?.page ?? null);
                  }}
                >
                  <StatusPill status={check.status} label={copy.status[check.status]} />
                  <span className="type-ui">{issueLabel(check.path, copy, extraction)}</span>
                  <span className="min-w-0 truncate type-ui text-muted">{lang === "uk" ? check.reason.uk : check.reason.en}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <ExportBar name={doc.name} extraction={extraction} />
        {extraction.escalated ? (
          <p className="mt-4 flex items-start gap-2 type-ui">
            <Info className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
            {copy.results.escalated}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-6 desk:min-h-0 desk:flex-1 desk:grid-cols-12 desk:overflow-hidden">
        <div className="desk:col-span-5 desk:min-h-0 desk:overflow-y-auto desk:pr-2">
          <ViewerPane doc={doc} active={active} />
        </div>
        <div className="desk:col-span-7 desk:min-h-0 desk:overflow-y-auto desk:pl-2">
          <section>
            <h2 className="type-title">{copy.groups.document}</h2>
            <div className="mt-4">
              <label htmlFor="field-document-type" className="type-ui text-muted">
                {copy.fields.documentType}
              </label>
              <select
                id="field-document-type"
                className="mt-1 h-11 w-full border-0 border-b border-hairline bg-transparent font-mono type-body tabular-nums"
                value={extraction.documentType}
                onChange={(event) => onType(event.target.value)}
              >
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {copy.docType[type]}
                  </option>
                ))}
              </select>
            </div>
            {unsupported ? (
              <p className="mt-6 max-w-xl type-body">{copy.results.unsupportedBody}</p>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <BoundField path="documentNumber" extraction={extraction} check={byPath.get("documentNumber")} onCommit={onCommit} />
                <BoundField path="issueDate" extraction={extraction} check={byPath.get("issueDate")} onCommit={onCommit} />
                <CurrencyField extraction={extraction} check={byPath.get("currency")} onCommit={onCommit} />
              </div>
            )}
          </section>
          {unsupported ? null : (
            <>
              <PartySection extraction={extraction} byPath={byPath} onCommit={onCommit} />
              <LineSection extraction={extraction} byPath={byPath} onCommit={onCommit} />
              <section className="mt-10">
                <h2 className="type-title">{copy.groups.totals}</h2>
                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <BoundField path="subtotal" extraction={extraction} check={byPath.get("subtotal")} onCommit={onCommit} />
                  <BoundField path="vatTotal" extraction={extraction} check={byPath.get("vatTotal")} onCommit={onCommit} />
                  <BoundField path="total" extraction={extraction} check={byPath.get("total")} onCommit={onCommit} />
                  <BoundField path="totalInWords" extraction={extraction} check={byPath.get("totalInWords")} onCommit={onCommit} />
                </div>
              </section>
              <section className="mt-10">
                <h2 className="type-title">{copy.groups.payment}</h2>
                <div className="mt-4">
                  <BoundField path="paymentPurpose" extraction={extraction} check={byPath.get("paymentPurpose")} onCommit={onCommit} />
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
    </TraceContext.Provider>
  );
}

function PartySection({
  extraction,
  byPath,
  onCommit,
}: {
  extraction: Extraction;
  byPath: Map<string, FieldCheck>;
  onCommit: (path: string, raw: string) => void;
}) {
  const { copy } = useI18n();
  const roles = copy.roles[extraction.documentType];
  return (
    <section className="mt-10">
      <h2 className="type-title">{copy.groups.parties}</h2>
      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <PartyColumn title={roles.seller} prefix="seller" extraction={extraction} byPath={byPath} onCommit={onCommit} />
        <PartyColumn title={roles.buyer} prefix="buyer" extraction={extraction} byPath={byPath} onCommit={onCommit} />
      </div>
    </section>
  );
}

function PartyColumn({
  title,
  prefix,
  extraction,
  byPath,
  onCommit,
}: {
  title: string;
  prefix: "seller" | "buyer";
  extraction: Extraction;
  byPath: Map<string, FieldCheck>;
  onCommit: (path: string, raw: string) => void;
}) {
  return (
    <div>
      <h3 className="type-title">{title}</h3>
      <div className="mt-4 flex flex-col gap-5">
        {PARTY_FIELDS.map((field) => (
          <BoundField
            key={field}
            path={`${prefix}.${field}`}
            extraction={extraction}
            check={byPath.get(`${prefix}.${field}`)}
            onCommit={onCommit}
          />
        ))}
      </div>
    </div>
  );
}

function LineSection({
  extraction,
  byPath,
  onCommit,
}: {
  extraction: Extraction;
  byPath: Map<string, FieldCheck>;
  onCommit: (path: string, raw: string) => void;
}) {
  const { copy } = useI18n();
  return (
    <section className="mt-10">
      <h2 className="type-title">{copy.groups.lines}</h2>
      {extraction.lineItems.length === 0 ? <p className="mt-4 type-ui">{copy.results.noLines}</p> : null}
      <div className="mt-4 flex flex-col gap-6">
        {extraction.lineItems.map((_line, index) => (
          <article key={index} className="rounded-card border border-hairline bg-raised p-4">
            <h3 className="font-mono type-meta text-muted">
              {copy.results.line} {index + 1}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {LINE_FIELDS.map((field) => (
                <BoundField
                  key={field}
                  path={`lineItems[${index}].${field}`}
                  extraction={extraction}
                  check={byPath.get(`lineItems[${index}].${field}`)}
                  onCommit={onCommit}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function fieldLabel(path: string, copy: ReturnType<typeof useI18n>["copy"]): string {
  const field = path.split(".").pop() ?? path;
  if (field in copy.fields) return copy.fields[field as keyof typeof copy.fields];
  return field;
}

function issueLabel(path: string, copy: ReturnType<typeof useI18n>["copy"], extraction: Extraction): string {
  const line = /^lineItems\[(\d+)\]\.(.+)$/.exec(path);
  if (line?.[1] && line[2]) {
    return `${copy.results.line} ${Number(line[1]) + 1} · ${fieldLabel(line[2], copy)}`;
  }
  const party = /^(seller|buyer)\.(.+)$/.exec(path);
  if (party?.[1] && party[2]) {
    const role = copy.roles[extraction.documentType][party[1] as "seller" | "buyer"];
    return `${role} · ${fieldLabel(party[2], copy)}`;
  }
  return fieldLabel(path, copy);
}

function readSourced(extraction: Extraction, path: string): Sourced<string | number> | null {
  const party = /^(seller|buyer)\.([A-Za-z]+)$/.exec(path);
  if (party?.[1] && party[2]) {
    return extraction[party[1] as "seller" | "buyer"][party[2] as keyof Party];
  }
  const line = /^lineItems\[(\d+)\]\.([A-Za-z]+)$/.exec(path);
  if (line?.[1] && line[2]) {
    const item = extraction.lineItems[Number(line[1])];
    if (!item) return null;
    return item[line[2] as keyof typeof item];
  }
  const top = extraction[path as keyof Extraction];
  if (top && typeof top === "object" && "value" in top && "evidence" in top) {
    return top as Sourced<string | number>;
  }
  return null;
}

function BoundField({
  path,
  extraction,
  check,
  onCommit,
}: {
  path: string;
  extraction: Extraction;
  check: FieldCheck | undefined;
  onCommit: (path: string, raw: string) => void;
}) {
  const { copy } = useI18n();
  const kind: FieldKind | null = fieldKind(path, extraction);
  const sourced = readSourced(extraction, path);
  if (!kind || !sourced) return null;
  const value = typeof sourced.value === "number" || typeof sourced.value === "string" ? sourced.value : null;
  return (
    <ValueField
      label={fieldLabel(path, copy)}
      path={path}
      kind={kind}
      value={value}
      evidence={sourced.evidence}
      page={sourced.page}
      check={check}
      onCommit={onCommit}
    />
  );
}

function CurrencyField({
  extraction,
  check,
  onCommit,
}: {
  extraction: Extraction;
  check: FieldCheck | undefined;
  onCommit: (path: string, raw: string) => void;
}) {
  const { lang, copy } = useI18n();
  const trace = useTrace();
  const reason = check ? (lang === "uk" ? check.reason.uk : check.reason.en) : null;
  const target = { evidence: extraction.currency.evidence, page: extraction.currency.page };
  return (
    <div
      onMouseEnter={() => trace("enter", target)}
      onMouseLeave={() => trace("leave", target)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="field-currency" className="type-ui text-muted">
          {copy.fields.currency}
        </label>
        {check ? <StatusPill status={check.status} label={copy.status[check.status]} /> : null}
      </div>
      <select
        id="field-currency"
        className="mt-1 h-11 w-full border-0 border-b border-hairline bg-transparent font-mono type-body tabular-nums"
        value={extraction.currency.value ?? ""}
        onChange={(event) => onCommit("currency", event.target.value)}
        onFocus={() => trace("focus", target)}
        onBlur={() => trace("blur", target)}
      >
        <option value="">{copy.results.emptyOption}</option>
        <option value="UAH">UAH</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
      </select>
      <FieldNote
        status={check?.status}
        reason={reason}
        evidence={extraction.currency.evidence}
        page={extraction.currency.page}
      />
    </div>
  );
}
