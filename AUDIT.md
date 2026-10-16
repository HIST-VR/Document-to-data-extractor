# DocLens UA polish audit

Reviewed 2026-10-16 after milestones A–F (`8a16ae0`). Product code was not changed for this audit. Screenshots are in `docs/shots/before/`. There is no attempts panel: schema retry and model escalation stay on the server, and the only escalated UI is one sentence. That state was not invented.

## Baseline

Commands from a clean production build, before any polish edit:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | 108 tests. Coverage on the gated files: 98.87% statements, 96.09% branches, 100% functions, 98.82% lines |
| `npm run build` | Pass. Main chunk about 354 kB, `xlsx` about 424 kB, `pdf` about 430 kB, pdf.js worker about 1.3 MB, CSS about 21 kB |

Lighthouse on `wrangler pages dev dist` (home page, headers applied):

| Category | Score |
| --- | --- |
| Performance | 98, then 95 on a repeat |
| Accessibility | 94 |
| Best practices | 96 |
| SEO | 91 |

Performance moved between runs. The floor used later is 95. The other three scores were stable.

The spec target is 95 or higher on all four. Accessibility, best practices, and SEO are short of that on this preview. Performance is not.

Playwright checks on home, file-ready, and all-ok results at 390, 834, and 1440, light and dark: no horizontal overflow, Onest, Source Serif 4, and JetBrains Mono each reported loaded, and a Cyrillic probe (`ЄДРПОУ`) measured 67 px wide. The consent checkbox is 20×20 in code and was not in those measurements.

## What similar tools do

Rossum’s validation screen keeps the document beside the fields, separates “must fix” from “please review”, and jumps from a blocker to the evidence on the page. Mindee’s post-processing is the same class of rule DocLens already runs: quantity times price, and line sums against the total. The useful pattern, inside this spec, is a summary that stays put, each problem listed once, and a click that focuses the field and highlights the evidence that already exists. Extra Rossum tools (zoom chrome, duplicate detection, redrawing boxes, blocking export) are out of scope.

## Ranked findings

### P0

1. **Uploaded images are called spreadsheets.** `ViewerPane` prints `copy.results.sheet` whenever `pageCount` is null. PDFs have a count. Images and spreadsheets do not. A spreadsheet therefore says “Spreadsheet” twice (`1440-light-escalated.png`). An uploaded image would say “Image” and then “Spreadsheet”. Fix: show a page count only when `pageCount` is a number. The kind line already names a spreadsheet or an image.

2. **Passed and warning text fails WCAG AA in the light theme.** Computed contrast of the spec swatches on `#F6F4EE`: ok `#1F8A4C` is 3.98:1, warning `#B7791F` is 3.31:1. Both are used as `text-xs` in `StatusPill`. Error `#C2362B` is 4.95:1, inside the minimum with almost no margin, and lower on white. Dark status colors pass (ok 10.39, warning 8.40, error 6.47 on `#14120F`). Fix: keep the spec swatches as `--ok`, `--warning`, and `--error`. Add darker ink companions for small text, at least 4.5:1 on both `#F6F4EE` and `#FFFFFF`. Candidates checked: ok `#0F6B3A` (6.00 / 6.59), warning `#7A4E0C` (6.53 / 7.19), error `#9A2E24` (6.84 / 7.53).

### P1

3. **The results summary leaves the screen, and problems are not listed in one place.** On the desk layout the viewer is sticky and the fields scroll the page (`ResultsView`, `ViewerPane`). `1440-light-results-issues.png` and `390-dark-results-issues.png`, before they were reframed, showed parties and the footer while the failed number and the arithmetic error sat above the fold. Changing the type to unsupported replaces the fields but leaves the scroll position, so `1440-light-unsupported.png` first showed the document tail and the footer, not the explanation. Fix: at `desk` (800 px) the summary stays put and the viewer and the fields scroll on their own. Below that, the summary sticks under the header and the page scrolls. List warning and error checks once under the summary. Activating one focuses `#field-…` and uses the existing evidence highlight.

4. **A failed extract cannot be retried.** `runExtract` sets the Turnstile token to null. `TurnstileBox` renders once per site key and does not ask for a new token. `1440-light-quota.png` shows the quota sentence, an empty spam-check slot, and a disabled Extract button. Fix: remount the widget after a failed request so a new token can arrive. Do not add a toast. The existing alert stays.

5. **Two controls fail automated accessibility checks, which is why Accessibility is 94.** The file input in `DropZone` is `sr-only` with no label, and it remains in the accessibility tree. The wordmark’s accessible name is “DocLens UA home”, but the visible text is `DocLens` + `UA` with no text node between them, so the accessible name does not contain `DocLensUA`. Fix: hide the file input from assistive tech and keep the labeled button. Put a space between “DocLens” and “UA”.

6. **The language toggle does not update `document.documentElement.lang`.** `public/theme.js` sets `lang` before paint from storage. `setLang` only writes localStorage and React state. After a click, the UI is Ukrainian and the document language stays `en` until reload. Fix: set `documentElement.lang` in `setLang`.

7. **`/robots.txt` is the SPA HTML.** `public/_redirects` sends `/*` to `index.html`. Lighthouse reports 19 robots.txt parse errors, and SEO is 91. Fix: add `public/robots.txt` that allows crawling. A real file is served ahead of the fallback. Do not remove the SPA redirect.

8. **The consent checkbox is a 20 px target.** `Checkbox` is `h-5 w-5`. The label is 44 px tall, the box is not. Fix: keep a small visual box and make the hit area at least 44 px.

9. **The results screen is too dense to scan.** Every passed field prints a full reason and a second “Printed:” line (`1440-light-results-ok.png`). Warning and error reasons use the same quiet style as passed reasons, so the failures do not lead. Fix: keep every reason available. Passed reasons sit on one muted line with the evidence. Warning and error reasons stay full size, and the summary list points at them.

10. **The visual system is a set of one-off values.** Radii are square. The header is an opaque bar. The theme control is a labeled button that crowds the 390 px header. Source Serif is on the hero, the drop zone, sample titles, progress, dialogs, the viewer filename, and section titles. Type sizes run from `text-xs` through `text-5xl`. Shadows are absent. The evidence highlight appears with no ease. Buttons have no press feedback. Focus is visible, which should stay. Fix: tokens for an 8 px space scale, six type sizes, three weights (400, 500, 600), radii 12 / 16 / 20, one hairline, one soft shadow, and motion `cubic-bezier(0.22, 1, 0.36, 1)` at 200–350 ms with a 100 ms press scale of 0.98. Serif only on the home hero. Onest everywhere else, including the wordmark. JetBrains Mono and tabular figures stay on values. Header: translucent, blurred, hairline below. Language and theme become segmented controls. Accent only on the primary action and focus. Semantic color only for validation.

11. **Best practices is 96 because of one CSP issue with no URL.** The page’s own CSP in `public/_headers` does not use `unsafe-inline` for scripts. `wrangler pages dev` injects a live-reload client. Treat 96 as the preview score, not as proof of a production CSP bug. The after run should record the same command. Do not weaken the CSP to silence a dev injector.

### P2

12. **The sample “Validate” step often never paints.** `openSample` sets “validate” and the results in the same synchronous block after `await`, so React batches them. `1440-light-processing.png` correctly shows Render in progress. Do not add a fake delay.

13. **Warning is labeled “Check”.** Next to “Passed” that word can mean the check succeeded. Ukrainian “Увага” is clearer. Proposed copy: “Review”. Not required for the layout work if time is short. Doing it is a one-line copy change in both catalogs.

14. **“Spam check” is jargon.** It is honest about Turnstile. Leave it unless the label can become “Confirm you are here” without implying a different control.

15. **`::selection` uses `#ffffff`.** Replace it with the paper color `#F6F4EE` when the selection rule is next to the tokens.

16. **`font-display: optional` can leave the fallback on a slow first load.** Size-adjusted fallbacks are already in place, and this run loaded all three families, including Cyrillic. Leave the strategy. It is what keeps the layout from shifting.

17. **History heading “On this device” needs its hint.** The hint is directly underneath and the privacy claim is accurate. Leave the heading.

18. **Upload and model share one request.** The UI marks upload done as the model step starts. That matches the network. Leave it.

## Checked, and not a defect to change

- Validators, date window, identifier checksums, money-words, and the planted arithmetic case are covered by the existing suite. This pass did not change them and did not rerun the live Gemini eval. No key is set.
- Evidence highlight works. The issues shots show the date phrase marked on the PDF. Missing text still falls back to the page and the quoted phrase.
- Session edits do not rewrite the IndexedDB snapshot. History reopen revalidates. Export uses the extraction currently on screen.
- Consent copy matches the required sentence. Samples do not call `/api/extract`. The quota message is the server string. Footer claims match the implementation: no server storage, no file in history.
- Secrets stay in the Worker. The client never logs bodies. CSP, `nosniff`, `no-referrer`, and frame denial are set.
- pdf.js and SheetJS are separate chunks. Dark surfaces are `#14120F` and `#1C1A16`, and dark text is `#F6F4EE`, not pure black or pure white.
- No horizontal scroll at 390 px on the measured screens. Primary buttons and the language controls are at least 44 px. Focus rings use the accent.

## Order of work

Fix 1 and 2 first, then 3 through 10, then 6 and 7 with them because they are small and they move the Lighthouse gaps. Leave 11 as a measured note unless the after run shows the same CSP issue without the dev injector. Leave 12 through 18.
