# Progress

## Done

- Milestone A. Shared Zod schema, normalizers, and deterministic validators, with Vitest coverage above 90% on each of those modules.
  - Document types: invoice, act, waybill, unknown. Unknown drops every field.
  - Amounts such as `1 234,56` and NBSP forms normalize to numbers. VAT `20` and `7` become `0.2` and `0.07`.
  - Checks: line arithmetic (±0.01), subtotal, VAT at 20/7/0, total, ЄДРПОУ, ІПН, UA IBAN (ISO 13616), issue dates, and amount-in-words when the phrase is in the supported set.
  - ЄДРПОУ and ІПН use the published community check digits. The State Tax Service has not published official algorithms. IBAN uses mod-97.
  - Amount-in-words shipped. A phrase outside the closed Ukrainian, Russian, and English set is left unchecked rather than failed.
  - `z.toJSONSchema()` is reduced to the Gemini `responseJsonSchema` keyword set.
  - Vite, React 18, TypeScript strict, Tailwind, ESLint, and Vitest are in place. The page is the wordmark only.

## Next

- Milestone B. Pages Function `POST /api/extract`, Gemini call, Turnstile, per-IP limit, KV daily cap, prompts, and `wrangler.toml`.

## Notes

- Gemini thinking override, confirmed in the docs: `generationConfig.thinkingConfig.thinkingLevel`. Sent only when `GEMINI_THINKING_LEVEL` is set. Default model remains `gemini-3.5-flash-lite` (its own default thinking level is minimal).
- Latest checks for this milestone: typecheck, lint, 44 tests, and production build all passed.
