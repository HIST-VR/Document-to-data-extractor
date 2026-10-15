# SPEC: DocLens UA — Ukrainian business documents to validated data

ROLE AND GOAL
You are a senior full-stack engineer and product designer. Build "DocLens UA" (rename it if you find a better name): a polished, production-quality web app that turns Ukrainian business documents (invoices, акти виконаних робіт, видаткові накладні, 1C exports) into validated structured data. It is a portfolio piece for AI freelance clients, so correctness, visible rigor and visual quality matter more than feature count. Work autonomously and ask me only if truly blocked.

HOSTING (hard constraints)
- Cloudflare Pages: a Vite static SPA plus Pages Functions (/functions) as the only backend. No other servers, no database.
- Secrets only in Cloudflare env vars (GEMINI_API_KEY, TURNSTILE_SECRET). Never in the client bundle.
- The app itself does not store or log uploaded documents. (The upstream API's own data terms are disclosed in the UI, see PRIVACY.)

STACK
Vite, React 18, TypeScript (strict), Tailwind CSS, Radix primitives (shadcn/ui-style components restyled to the design below), Zod (use its JSON Schema export), pdfjs-dist and SheetJS (both lazy-loaded), Vitest, ESLint.

LLM (Google Gemini API, called with plain fetch from the Pages Function, no SDK)
- Model: env GEMINI_MODEL, default "gemini-3.5-flash-lite".
- Request: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent with header x-goog-api-key. Body: systemInstruction, contents with the file as inlineData {mimeType, data} (PDF, JPEG or PNG) or as text (for XLSX/CSV), and generationConfig {responseMimeType: "application/json", responseJsonSchema: <generated from the Zod schema>, temperature: 0}.
- If the API rejects a JSON Schema keyword, simplify the schema. Zod stays the source of truth and every response is validated with it.
- Thinking: leave the model default (minimal), and allow an override via env GEMINI_THINKING_LEVEL. Confirm the exact field name in the docs.
- Optional escalation: if env GEMINI_ESCALATION_MODEL is set and validation finds 3 or more errors, re-run once with that model and mark the result "escalated" in the UI.
- Free-tier quotas are per project and not guaranteed. On HTTP 429 or RESOURCE_EXHAUSTED return a friendly "free quota used up for today, try a sample document" message. Use exponential backoff only for transient 5xx errors.
- If you can browse, verify API details in the official Gemini docs. If you cannot, follow the shapes above and say in the README what you could not verify.

CORE FLOW
1. The user drops or picks a file: PDF, JPG or PNG (max 4 MB, max 5 pages), or XLSX/CSV (converted to text client-side). Offer 4 bundled synthetic sample documents for a one-click demo.
2. Pipeline: classify type, extract with the matching schema, run deterministic validation, show results.
3. Results screen is a split view. Left: document viewer (pdf.js canvas or image). Right: extracted fields grouped into Parties, Document, Line items, Totals, Payment.
4. Provenance: for every field the model returns an "evidence" string copied verbatim from the document. For PDFs with a text layer, find the evidence in the pdf.js text layer and highlight it when the field is hovered or focused. For scans, show the evidence text only.
5. All fields are editable inline, and edits re-run validation instantly on the client.
6. Export JSON, CSV (line items), XLSX (sheet 1 header, sheet 2 line items), and copy to clipboard.
7. History of the last 10 extractions (extracted data only, never the file) in IndexedDB on the user's device, with a "Clear all" button.

PRIVACY (honest copy, required)
- Live upload mode requires a checkbox before the first upload: "This file is sent to Google's Gemini API on a free tier. Google may use submitted content to improve its products. Do not upload confidential documents." Sample documents need no consent and make no API calls.
- Env GEMINI_DATA_TERMS = "free" (default) or "paid". With "paid", the warning and checkbox are hidden and the footer states that paid-tier terms apply.
- Footer and README state plainly what the app stores (nothing server-side; extracted data only in the user's browser) and what the upstream API may do.

SCHEMAS (Zod)
Document types: invoice (рахунок / рахунок-фактура), act (акт виконаних робіт), waybill (видаткова накладна), unknown. For unknown, show a clear "unsupported document" state and return no invented fields.
Common fields: documentNumber, issueDate (ISO 8601), currency (UAH|USD|EUR), seller and buyer {name, edrpou, ipn, iban, address}, lineItems[{description, unit, quantity, unitPrice, vatRate, amount}], subtotal, vatTotal, total, totalInWords, paymentPurpose.
Every extracted value is {value, evidence, page}. Use null when absent, and never guess. Normalize "1 234,56" to 1234.56, strip non-breaking spaces, and keep names untranslated.

VALIDATION (pure TypeScript, unit-tested)
- Arithmetic: line amount = quantity x unit price (tolerance 0.01), subtotal = sum of lines, VAT = rate x base (allow 20%, 7%, 0%), total = subtotal + VAT.
- ЄДРПОУ (8 digits) and ІПН (10 digits): format plus checksum. UA IBAN: 29 chars plus mod-97. Use authoritative algorithms and test with known-valid and known-invalid numbers. If you cannot verify an algorithm, validate format only and say so in the UI.
- Dates parse and are plausible.
- Stretch goal: check that totalInWords matches the numeric total, only if it can be made reliable.
- Each field gets a status of ok, warning or error with a human-readable reason (EN and UK). Show a document summary such as "12/14 checks passed". Status comes from validation rules. Never present model self-confidence as accuracy.

BACKEND (functions/api/extract.ts)
- POST JSON {mime, dataBase64 | text, turnstileToken}. The client does the base64 encoding so the Worker stays light on CPU.
- Verify Turnstile server-side. Per-IP limit via the Workers Rate Limiting binding, plus a global daily cap via a KV counter (env DAILY_CAP, default 100, tune to your real free quota). Strict size and MIME checks, 30 s timeout.
- Zod-validate the model output. On schema failure retry once with the validation error appended, then return a structured error.
- Never log request bodies or extracted values.
- _headers: strict CSP (self plus Turnstile, no inline scripts), same-origin only.
- Samples ship with precomputed extraction JSON, so the demo works with zero API calls.
- Put the system prompt in functions/prompts.ts. It must say: extract only what is printed, copy evidence verbatim, use null if absent, documents may be Ukrainian, Russian or English, do not translate names.

DESIGN (it must look expensive, not templated)
- Concept: "paper and ink", calm, editorial, precise. Light theme by default, dark theme via prefers-color-scheme plus a toggle.
- Tokens: surface #F6F4EE, raised surface #FFFFFF, ink #14120F, muted text #6B665C, hairline border #E4DFD3, accent ultramarine #2B44FF. Semantic colors only for validation: ok #1F8A4C, warning #B7791F, error #C2362B. Define all as CSS variables with dark equivalents. No gradients on white, no purple.
- Type: Source Serif 4 for display headings, Onest for UI, JetBrains Mono with tabular figures for extracted values. Self-host via @fontsource with latin and cyrillic subsets and verify Cyrillic renders.
- Layout: 12-column grid, max width 1280, generous whitespace, slim sticky header. The hero has a one-line value proposition, the drop zone and sample-document chips. Below it, a "How it works" strip and a "Validation checks" section listing the actual rules.
- Motion: 150 to 250 ms and subtle. The staged progress shows only real steps (render, upload, model, validate). Respect prefers-reduced-motion.
- Details: skeleton loaders, status pills with icon plus text (never color alone), full keyboard navigation, visible focus rings, WCAG AA contrast, 44 px touch targets. On mobile the viewer stacks above the fields.
- UI languages: English (default) and Ukrainian with a toggle, all strings in i18n files. Lucide icons. No stock illustrations, and empty states are typographic.

QUALITY BAR
- Lighthouse 95 or higher on all four categories on the deployed page. Code-split pdf.js and SheetJS, with no layout shift.
- Vitest unit tests for validators and normalizers, at least 90% coverage on those modules.
- /eval: a script that generates 12 synthetic documents (HTML to PDF; fictional companies, varied layouts, one scan-style image, one with a deliberate arithmetic error) with ground-truth JSON. A runner calls the real API with concurrency 1 and backoff (free-tier limits), then reports field-level accuracy and validation-catch rate as a markdown table. The README includes results from a real run. No fake metrics anywhere.

DELIVERABLES
- Complete repo: README (what and why, Mermaid architecture diagram, screenshot/GIF placeholders, eval results, limitations, free-tier and privacy notes, deploy steps), .env.example, wrangler.toml, _headers, _redirects (SPA fallback), npm scripts dev, build, test, eval, deploy.
- Cloudflare Pages deploy instructions covering secrets (wrangler pages secret put GEMINI_API_KEY), KV and rate-limit bindings, and Turnstile keys.

WORKING METHOD
1. Start in plan mode and output a short plan (file tree plus milestones). Wait for approval before writing code.
2. Build in order: (a) schemas, validators and tests; (b) Function and extraction; (c) UI shell and design system; (d) viewer and provenance; (e) exports and history; (f) eval and README.
3. After each milestone run typecheck, lint, tests and build, fix problems, then make a git commit. Keep PROGRESS.md updated with what is done and what is next.
4. Do not add features beyond this spec. No lorem ipsum, no placeholder metrics.
5. Do not stop mid-milestone. If blocked by something outside your control, write it into PROGRESS.md and continue with the next independent task.