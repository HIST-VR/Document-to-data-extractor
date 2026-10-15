import { createContext, useContext } from "react";
import { en, type Copy } from "./en";
import { uk } from "./uk";

export type Lang = "en" | "uk";

export interface I18nValue {
  lang: Lang;
  copy: Copy;
  setLang: (lang: Lang) => void;
}

export const I18nContext = createContext<I18nValue | null>(null);

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n requires a provider");
  }
  return value;
}

export function copyFor(lang: Lang): Copy {
  return lang === "uk" ? uk : en;
}
