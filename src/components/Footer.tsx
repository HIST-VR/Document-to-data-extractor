import { useI18n } from "../i18n";

export function Footer({ terms }: { terms: "free" | "paid" | null }) {
  const { copy } = useI18n();
  return (
    <footer className="shrink-0 border-t border-hairline">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-4 py-8 type-ui text-muted sm:px-8">
        <p>{copy.footer.storage}</p>
        <p>
          {terms === "paid" ? copy.footer.browserPaid : terms === "free" ? copy.footer.browserFree : copy.footer.browserUnknown}
        </p>
        {terms === "paid" ? <p>{copy.footer.paidTerms}</p> : null}
        {terms === "free" ? <p>{copy.footer.freeTerms}</p> : null}
        <p>{copy.footer.samples}</p>
      </div>
    </footer>
  );
}
