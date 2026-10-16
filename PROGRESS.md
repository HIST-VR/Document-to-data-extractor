# Progress

## Done

- Milestone A. Shared Zod schema, normalizers, and deterministic validators, with Vitest coverage above 90% on each of those modules.
  - Amounts such as `1 234,56` normalize to numbers. VAT `20` and `7` become rates. Unknown documents drop every field.
  - Checks cover line arithmetic (±0.01), subtotal, VAT at 20/7/0, total, ЄДРПОУ, ІПН, UA IBAN (ISO 13616), issue dates, and amount-in-words when the phrase is in the supported set.
  - ЄДРПОУ and ІПН use the published community check digits. The State Tax Service has not published official algorithms.
- Milestone B. `POST /api/extract` and `GET /api/config` on Cloudflare Pages Functions.
  - Gemini `generateContent` uses `x-goog-api-key`, `responseJsonSchema` from Zod, and `temperature: 0`. If the model rejects temperature, the Function retries once without it.
  - `generationConfig.thinkingConfig.thinkingLevel` is sent only when `GEMINI_THINKING_LEVEL` is `minimal`, `low`, `medium`, or `high`.
  - Turnstile is checked server-side. Per-IP limit is 6 requests / 60 seconds. KV key `usage:YYYY-MM-DD` enforces `DAILY_CAP` (default 100) per outbound Gemini call.
  - Schema failures retry once with the issue paths attached. Three or more validation errors re-run on `GEMINI_ESCALATION_MODEL` when that env var is set, and the result is marked `escalated`.
  - HTTP 429 and `RESOURCE_EXHAUSTED` return "Free quota used up for today, try a sample document." Other 5xx responses back off at 0.5s and 1.5s. Each Gemini call has a 30s timeout.
  - Local dev is `npm run dev` (Vite on 5173, `wrangler pages dev --proxy 5173` on 8788). Verified locally: `/api/config`, a rejected `POST /api/extract`, and an unknown path serving the SPA shell.
- Milestone C. Paper-and-ink UI shell.
  - Tokens, self-hosted Source Serif 4, Onest, and JetBrains Mono (latin and Cyrillic), EN/UK copy, and a light/dark toggle. First paint reads `public/theme.js` so the CSP can stay free of inline scripts.
  - Landing page has the drop zone, four fictional samples, the real pipeline steps, and the validation rules. Free-tier consent is required before a live upload. Samples fetch only `/samples/*` and do not call `/api/extract`.
  - Results show grouped editable fields, status pills, and a placeholder viewer (file name, kind, page count, sample or upload). Changing a value revalidates on the device. An unsupported type hides the fields and keeps the stored values for when the type is switched back.
  - pdf.js and SheetJS are in separate chunks.
- Milestone D. Document viewer and evidence highlights.
  - A PDF is drawn on a canvas with a pdf.js text layer. An image is shown as an image. A spreadsheet is shown as the converted text.
  - Hovering or focusing a field highlights its printed phrase. Whitespace and NBSP are collapsed before the search. The highlight scrolls the matching page into view. Keyboard focus uses the same highlight as hover.
  - If the phrase is not in that page's text layer, the viewer quotes the phrase and does not draw a box. An image has no text layer, so it always quotes the phrase.
- Milestone E. JSON, CSV, and XLSX export, clipboard copy, and on-device history.
  - JSON is the extraction. CSV is semicolon-delimited UTF-8 with a BOM. XLSX has a Header sheet and a Lines sheet. SheetJS stays in its own chunk and loads only for the XLSX download.
  - Cells that start with `=`, `+`, `-`, or `@` are prefixed with a quote. IndexedDB keeps the last 10 extractions (name, type, time, fields) and never the file. Clear all wipes the store. Opening a row revalidates with the current rules.
  - The footer says this browser keeps the last 10 extractions and does not keep the file.
- Milestone F. Eval harness and README.
  - `npm run eval` writes 12 fictional documents. HTML is printed to PDF, and one scan-style page is a PNG. Ground truth is the printed text. One invoice prints a line amount that is not quantity times price.
  - The shared validator caught that planted defect: 1 of 1. That number is not a model score.
  - No `GEMINI_API_KEY` was available, so the live Gemini run was not done and the report has no field-accuracy number. With a key, the runner calls Gemini one document at a time, waits 5 seconds between documents, and on HTTP 429 waits 20 seconds and then 40 seconds.

## Polish pass

Reviewed in `AUDIT.md`, then applied. Validators, exports, history, and the Gemini request were not changed. The live eval was not run again.

- The viewer prints a page count only when it has one. An image or a spreadsheet is no longer labeled as a spreadsheet twice.
- On a wide screen the check summary stays put. The document and the fields scroll on their own. Below that width the summary sticks under the header.
- Warnings and errors are listed once under the summary. Activating a row focuses that field and highlights the printed phrase the viewer already knows how to find.
- A failed extract remounts Turnstile. Removing the old widget cannot clear the new token. After a mocked 429, Extract became available again.
- The file input is out of the tab order and hidden from assistive tech. The labeled button remains the control. The wordmark's accessible name contains the visible "DocLens UA". The language toggle sets `document.documentElement.lang`. `public/robots.txt` allows crawling, and the SPA redirect stays.
- Status text uses darker ink on the light paper so small labels clear WCAG AA. The spec swatches stay the tints. The consent checkbox hit area is 44 px. The drawn box stays 20 px.
- Type, radius, shadow, and motion now come from tokens in `src/index.css`. Source Serif 4 is only the landing heading. Onest is the UI face. JetBrains Mono stays on values.

Left on purpose: the warning label "Check", the label "Spam check", the history heading "On this device", `font-display: optional`, the sample Validate step often being batched away, and one request for the upload and the model. There is still no attempts panel. Best practices stayed at 96. That score is one devtools issue with no URL on `wrangler pages dev`, and the CSP was not weakened.

## Visual QA

Checked against the production build on `wrangler pages dev dist`. Screenshots and measurements are in `docs/shots/after/`.

| Check | Result |
| --- | --- |
| No horizontal scroll at 390 px | Pass. All 18 measured pages in `metrics.json` report `overflow: false`, including every 390 px page. |
| Tap targets at least 44 px | Pass on those pages (`targets` is empty). The open consent checkbox measured 44×44. Its drawn mark stays 20 px. The file input is 1×1, `aria-hidden`, and not in the tab order. |
| Focus visible | Pass. Keyboard focus showed a 2 px solid accent outline on the skip link, the sample, New document, Choose a file, the consent checkbox, and Continue. |
| Contrast AA in both themes | Pass for the home Lighthouse color-contrast audit (score 1, no failing items) and for the token pairs in `AUDIT.md`. |
| Cyrillic in all three fonts | Pass. Onest, Source Serif 4, and JetBrains Mono each loaded. A `ЄДРПОУ` probe measured 67 px wide. |
| No layout shift on load | Pass on the home Lighthouse run. Cumulative layout shift scored 1, displayed as 0. The results screen did not get its own Lighthouse run. |
| No console errors | Pass on the home `errors-in-console` audit (score 1, no items) and during the keyboard tour below (no console errors, no page errors). |
| Keyboard-only run-through | Pass for the path below. Extract was not activated, so Gemini was not called. |

Keyboard path, English, light, 1440×900. Tab reached the invoice sample in 8 tabs. Enter opened it. Tab reached the first line amount. Typing `100` and leaving the field changed the heading to 27/30. Shift+Tab reached New document. Enter returned home. Tab reached the history row. Enter reopened the stored extraction at 30/30, so the edit had not been written back. Tab reached New document and Enter returned to the landing heading. Tab reached Choose a file. Setting `public/samples/invoice.pdf` opened the consent dialog with focus on the checkbox, whose name is the consent sentence. Space checked it. Tab reached Continue, which was enabled. Enter accepted. Extract was on screen, 44 px tall, and disabled until a Turnstile token arrives.

Lighthouse on that home page, after the polish: performance 95, accessibility 100, best practices 96, SEO 100. The saved before repeat was 95, 94, 96, and 91. None of the four dropped. Performance had also scored 98 on an earlier before run. The spec target of 95 or higher is met on performance, accessibility, and SEO. Best practices remains 96.

## Next

- The spec milestones and this polish pass are complete. A live eval needs `GEMINI_API_KEY`.

## Notes

- Wrangler 4.151.0 rejects compatibility date `2026-10-16` as in the future. `wrangler.toml` uses `2026-10-12`.
- Wrangler warns that `/* /index.html 200` looks like a loop. A request to `/documents` on the local Pages server still returned the app shell with status 200.
- Replace the placeholder KV id before deploy. Dummy Turnstile keys in `.env.example` always pass and are for local development only.
- `npm audit` reports one high severity issue in `xlsx` (SheetJS community edition: prototype pollution and ReDoS). The spec requires SheetJS, so the package stays. Spreadsheet parsing stays inside the lazy chunk.
- Latest checks for milestone C: typecheck, lint, 87 tests, and production build passed. In the browser, against `wrangler pages dev dist` on port 8788: landing copy, UK toggle, dark theme, invoice sample at 30/30 with no `/api/extract`, inline amount edit to 27/30, rejected non-numeric draft, unsupported type, fields kept after switching back, spreadsheet sample at 24/24, consent checkbox, and the viewer stacked above the fields at 390px. Console had no errors.
- Latest checks for milestone D: typecheck, lint, 95 tests, and production build passed. pdf.js stays in its own chunk. In the browser, the invoice canvas highlighted `№ СД-1042`, the date substring `16.03.2026`, and `Сума 6 000,00` on the matching line. Leaving a hovered field restored the focused field's highlight. The 1C export highlighted `Номер;ЕКС-15` in the text. No `/api/extract` request. At 390px the viewer stayed above the fields. Console had no errors. The image preview was not opened in the browser: the shipped samples are a PDF and a CSV.
- Latest checks for milestone E: typecheck, lint, 101 tests, and production build passed. The XLSX chunk stays separate from the main bundle. In the browser, against `wrangler pages dev dist` on port 8788: the invoice sample stayed at 30/30, JSON/CSV/XLSX downloads matched the sample (Header and Lines, number СД-1042), clipboard copy showed Скопійовано, and a history row reopened at 30/30 with no canvas and the sentence that the file is not kept. The stored record keys were id, name, documentType, createdAt, and extraction. Clear all left the store empty and disabled the button. No `/api/extract` request. Console had no errors. Live Extract was not clicked. The 390px layout and the image viewer were not rechecked in this pass.
- Latest checks for milestone F: typecheck, lint, 108 tests, and production build passed. pdf.js and SheetJS stay in separate chunks. `npm run eval` rendered the corpus and wrote `eval/report.md`. Google's Gemini 3.5 Flash-Lite notes confirm the model id and `thinking_level`, and say `temperature` is deprecated. `responseJsonSchema` was not named on that page. Screenshots in the README are from the local production build.
- Latest checks for the polish pass: typecheck, lint, and 108 tests passed again. Coverage on the gated files was unchanged (98.87% statements, 96.09% branches, 100% functions, 98.82% lines). `npm run shots` wrote `docs/shots/before/` and `docs/shots/after/`. The keyboard tour above ran against the production build. No test asserted the viewer page-count line, the warning label, or the Turnstile retry, so the suite was not edited.
