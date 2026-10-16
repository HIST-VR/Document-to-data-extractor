import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../i18n";
import { activeTheme, writeTheme, type ThemeChoice } from "../lib/prefs";

export function Header({ onHome }: { onHome: () => void }) {
  const { lang, setLang, copy } = useI18n();
  const [theme, setTheme] = useState<ThemeChoice>(() => activeTheme());

  function chooseTheme(next: ThemeChoice) {
    writeTheme(next);
    setTheme(next);
  }

  return (
    <header className="bar sticky top-0 z-20 shrink-0 border-b border-hairline">
      <a href="#main" className="skip-link type-ui font-medium">
        {copy.header.skip}
      </a>
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-8">
        <button type="button" onClick={onHome} className="flex min-h-11 items-baseline gap-2" aria-label={copy.header.home}>
          <span className="type-title">DocLens</span>
          <span className="sr-only"> </span>
          <span className="font-mono type-meta text-accent-ink">UA</span>
        </button>
        <div className="flex items-center gap-2">
          <div role="group" aria-label={copy.header.language} className="inline-flex overflow-hidden rounded-control border border-hairline">
            <button
              type="button"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
              className={`btn min-h-11 min-w-11 px-3 type-ui ${lang === "en" ? "bg-ink text-surface" : "bg-raised text-ink"}`}
            >
              EN
            </button>
            <button
              type="button"
              aria-pressed={lang === "uk"}
              onClick={() => setLang("uk")}
              className={`btn min-h-11 min-w-11 px-3 type-ui ${lang === "uk" ? "bg-ink text-surface" : "bg-raised text-ink"}`}
            >
              UK
            </button>
          </div>
          <div role="group" aria-label={copy.header.theme} className="inline-flex overflow-hidden rounded-control border border-hairline">
            <button
              type="button"
              aria-pressed={theme === "light"}
              aria-label={copy.header.themeToLight}
              onClick={() => chooseTheme("light")}
              className={`btn inline-flex h-11 w-11 items-center justify-center ${theme === "light" ? "bg-ink text-surface" : "bg-raised text-ink"}`}
            >
              <Sun className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              aria-label={copy.header.themeToDark}
              onClick={() => chooseTheme("dark")}
              className={`btn inline-flex h-11 w-11 items-center justify-center ${theme === "dark" ? "bg-ink text-surface" : "bg-raised text-ink"}`}
            >
              <Moon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
