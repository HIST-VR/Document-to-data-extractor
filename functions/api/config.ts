import type { Env } from "../env";
import { handleConfig } from "../handle-extract";

export const onRequestGet: PagesFunction<Pick<Env, "GEMINI_DATA_TERMS" | "TURNSTILE_SITE_KEY">> = (context) => {
  return handleConfig(context.env);
};
