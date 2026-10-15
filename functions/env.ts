export interface UsageKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface RequestLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  GEMINI_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_THINKING_LEVEL?: string;
  GEMINI_ESCALATION_MODEL?: string;
  GEMINI_DATA_TERMS?: string;
  DAILY_CAP?: string;
  USAGE_KV: UsageKv;
  EXTRACT_LIMITER: RequestLimiter;
}

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export const QUOTA_MESSAGE = "Free quota used up for today, try a sample document.";

export const DAILY_CAP_MESSAGE = "The daily extraction limit for this demo has been reached. Try a sample document.";

export const TIMEOUT_MESSAGE = "The model took too long to respond. Try again.";

export const UPSTREAM_MESSAGE = "The model service failed. Try again in a moment.";

export const SCHEMA_MESSAGE = "The model returned data that did not match the document schema.";

export function configuredModel(env: Env): string {
  const model = env.GEMINI_MODEL?.trim();
  return model ? model : DEFAULT_MODEL;
}

export function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function dailyCap(value: string | undefined): number {
  if (value == null || value.trim() === "") {
    return 100;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 100;
  }
  return parsed;
}

const THINKING_LEVELS = new Set(["minimal", "low", "medium", "high"]);

export function thinkingLevel(value: string | undefined): string | undefined {
  const level = value?.trim().toLowerCase();
  if (!level || !THINKING_LEVELS.has(level)) {
    return undefined;
  }
  return level;
}

export function dataTerms(value: string | undefined): "free" | "paid" {
  return value?.trim().toLowerCase() === "paid" ? "paid" : "free";
}
