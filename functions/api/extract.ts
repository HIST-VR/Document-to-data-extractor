import type { Env } from "../env";
import { handleExtract } from "../handle-extract";

interface PagesEnv {
  GEMINI_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_THINKING_LEVEL?: string;
  GEMINI_ESCALATION_MODEL?: string;
  GEMINI_DATA_TERMS?: string;
  DAILY_CAP?: string;
  USAGE_KV: Env["USAGE_KV"];
  EXTRACT_LIMITER?: Env["EXTRACT_LIMITER"];
}

export const onRequestPost: PagesFunction<PagesEnv> = (context) => {
  return handleExtract(context.request, context.env);
};
