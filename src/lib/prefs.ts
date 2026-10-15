export type ThemeChoice = "light" | "dark";
export type LangChoice = "en" | "uk";

const THEME_KEY = "doclens-theme";
const LANG_KEY = "doclens-lang";
const CONSENT_KEY = "doclens-consent";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private mode or a full disk. The page still works for this visit. */
  }
}

export function readTheme(): ThemeChoice | null {
  const value = read(THEME_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function activeTheme(): ThemeChoice {
  const stored = readTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function writeTheme(theme: ThemeChoice): void {
  write(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#14120F" : "#F6F4EE");
}

export function readLang(): LangChoice {
  return read(LANG_KEY) === "uk" ? "uk" : "en";
}

export function writeLang(lang: LangChoice): void {
  write(LANG_KEY, lang);
  document.documentElement.lang = lang === "uk" ? "uk" : "en";
}

export function readConsent(): boolean {
  return read(CONSENT_KEY) === "accepted";
}

export function writeConsent(): void {
  write(CONSENT_KEY, "accepted");
}
