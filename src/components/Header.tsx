import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../i18n";
import { activeTheme, writeTheme, type ThemeChoice } from "../lib/prefs";

export function Header({ onHome }: { onHome: () => void }) {
  const { lang, setLang, copy } = useI18n();
  const [theme, setTheme] = useState<ThemeChoice>(() => activeTheme());
  const nextTheme: ThemeChoice = theme === "dark" ? "light" : "dark";

  function toggleTheme() {
    writeTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-surface">
      <a href="#main" className="skip-link font-medium">
        {copy.header.skip}
      </a>
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8">
        <button type="button" onClick={onHome} className="flex min-h-11 items-baseline gap-2" aria-label={copy.header.home}>
          <span className="font-display text-xl tracking-tight">DocLens</span>
          <span className="font-mono text-xs text-accent-ink">UA</span>
        </button>
        <div className="flex items-center gap-2">
          <div role="group" aria-label={copy.header.language} className="flex border border-hairline">
            <button
              type="button"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
              className={`min-h-11 min-w-11 px-3 text-sm ${lang === "en" ? "bg-ink text-surface" : "bg-raised text-ink"}`}
            >
              EN
            </button>
            <button
              type="button"
              aria-pressed={lang === "uk"}
              onClick={() => setLang("uk")}
              className={`min-h-11 min-w-11 px-3 text-sm ${lang === "uk" ? "bg-ink text-surface" : "bg-raised text-ink"}`}
            >
              UK
            </button>
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 border border-hairline bg-raised px-3 text-sm"
            onClick={toggleTheme}
          >
            {nextTheme === "dark" ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
            {nextTheme === "dark" ? copy.header.themeToDark : copy.header.themeToLight}
          </button>
        </div>
      </div>
    </header>
  );
}
