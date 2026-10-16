import { useState, type ReactNode } from "react";
import { readLang, writeLang, type LangChoice } from "../lib/prefs";
import { I18nContext, copyFor, type Lang } from "./index";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const initial = readLang();
    if (typeof document !== "undefined") document.documentElement.lang = initial;
    return initial;
  });

  function setLang(next: LangChoice) {
    setLangState(next);
    writeLang(next);
    document.documentElement.lang = next;
  }

  return (
    <I18nContext.Provider value={{ lang, copy: copyFor(lang), setLang }}>{children}</I18nContext.Provider>
  );
}
