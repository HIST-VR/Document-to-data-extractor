import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { useI18n } from "../../i18n";
import { clearHistory, listHistory, type HistoryRecord } from "../../lib/history";

export function HistoryPanel({ onOpen }: { onOpen: (record: HistoryRecord) => void }) {
  const { lang, copy } = useI18n();
  const [rows, setRows] = useState<HistoryRecord[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const format = new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  useEffect(() => {
    let cancelled = false;
    void listHistory()
      .then((records) => {
        if (!cancelled) setRows(records);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function clear() {
    await clearHistory();
    setRows([]);
  }

  return (
    <section className="mt-16 border-t border-hairline pt-10" aria-labelledby="history-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="history-title" className="type-display">{copy.history.title}</h2>
          <p className="mt-3 max-w-2xl type-ui text-muted">{copy.history.hint}</p>
        </div>
        <Button onClick={() => void clear()} disabled={!rows || rows.length === 0}>{copy.history.clear}</Button>
      </div>
      {unavailable ? <p role="alert" className="mt-6 type-ui">{copy.history.unavailable}</p> : null}
      {rows && rows.length === 0 ? <p className="mt-6 type-ui">{copy.history.empty}</p> : null}
      {rows && rows.length > 0 ? (
        <ul className="mt-6 border-t border-hairline">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="flex min-h-11 w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline py-3 text-left"
                onClick={() => onOpen(row)}
              >
                <span className="font-mono type-ui">{row.name}</span>
                <span className="type-ui text-muted">{copy.docType[row.documentType]}</span>
                <time dateTime={row.createdAt} className="font-mono type-meta text-muted">{format.format(new Date(row.createdAt))}</time>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
