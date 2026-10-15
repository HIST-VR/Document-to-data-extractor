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

## Next

- Milestone F. Eval harness of 12 synthetic documents, and the README.

## Notes

- Wrangler 4.151.0 rejects compatibility date `2026-10-16` as in the future. `wrangler.toml` uses `2026-10-12`.
- Wrangler warns that `/* /index.html 200` looks like a loop. A request to `/documents` on the local Pages server still returned the app shell with status 200.
- Replace the placeholder KV id before deploy. Dummy Turnstile keys in `.env.example` always pass and are for local development only.
- `npm audit` reports one high severity issue in `xlsx` (SheetJS community edition: prototype pollution and ReDoS). The spec requires SheetJS, so the package stays. Spreadsheet parsing stays inside the lazy chunk.
- Latest checks for milestone C: typecheck, lint, 87 tests, and production build passed. In the browser, against `wrangler pages dev dist` on port 8788: landing copy, UK toggle, dark theme, invoice sample at 30/30 with no `/api/extract`, inline amount edit to 27/30, rejected non-numeric draft, unsupported type, fields kept after switching back, spreadsheet sample at 24/24, consent checkbox, and the viewer stacked above the fields at 390px. Console had no errors.
- Latest checks for milestone D: typecheck, lint, 95 tests, and production build passed. pdf.js stays in its own chunk. In the browser, the invoice canvas highlighted `№ СД-1042`, the date substring `16.03.2026`, and `Сума 6 000,00` on the matching line. Leaving a hovered field restored the focused field's highlight. The 1C export highlighted `Номер;ЕКС-15` in the text. No `/api/extract` request. At 390px the viewer stayed above the fields. Console had no errors. The image preview was not opened in the browser: the shipped samples are a PDF and a CSV.
- Latest checks for milestone E: typecheck, lint, 101 tests, and production build passed. The XLSX chunk stays separate from the main bundle. In the browser, against `wrangler pages dev dist` on port 8788: the invoice sample stayed at 30/30, JSON/CSV/XLSX downloads matched the sample (Header and Lines, number СД-1042), clipboard copy showed Скопійовано, and a history row reopened at 30/30 with no canvas and the sentence that the file is not kept. The stored record keys were id, name, documentType, createdAt, and extraction. Clear all left the store empty and disabled the button. No `/api/extract` request. Console had no errors. Live Extract was not clicked. The 390px layout and the image viewer were not rechecked in this pass.
