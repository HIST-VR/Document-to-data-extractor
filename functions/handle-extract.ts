import { z } from "zod";
import {
  configuredModel,
  dailyCap,
  dataTerms,
  optionalEnv,
  thinkingLevel,
  UPSTREAM_MESSAGE,
  type Env,
} from "./env";
import { ExtractFailure, runExtraction } from "./gemini";
import { json } from "./http";
import { base64DecodedLength, reserveDailyCall, verifyTurnstile } from "./limits";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_TEXT = 500_000;
const FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const requestSchema = z
  .object({
    mime: z.string().optional(),
    dataBase64: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    turnstileToken: z.string().min(1),
  })
  .strict();

export interface ExtractDeps {
  fetchImpl?: typeof fetch | undefined;
  sleep?: ((ms: number) => Promise<void>) | undefined;
  now?: Date | undefined;
  timeoutMs?: number | undefined;
}

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

function badRequest(message: string): Response {
  return json({ ok: false, error: "bad_request", message }, 400);
}

export function handleConfig(env: Pick<Env, "GEMINI_DATA_TERMS" | "TURNSTILE_SITE_KEY">): Response {
  return json({
    dataTerms: dataTerms(env.GEMINI_DATA_TERMS),
    turnstileSiteKey: env.TURNSTILE_SITE_KEY?.trim() ?? "",
  });
}

export async function handleExtract(request: Request, env: Env, deps: ExtractDeps = {}): Promise<Response> {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed", message: "Use POST." }, 405);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("The request body must be JSON.");
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest("The request is missing a file or a Turnstile token.");
  }
  const body = parsed.data;
  const hasFile = body.dataBase64 != null;
  const hasText = body.text != null;
  if (hasFile && hasText) {
    return badRequest("Send either a file or document text, not both.");
  }
  if (!hasFile && !hasText) {
    return badRequest("Send a file or document text.");
  }

  let inlineData: { mimeType: string; data: string } | undefined;
  let documentText: string | undefined;
  if (hasFile && body.dataBase64) {
    if (!body.mime || !FILE_TYPES.has(body.mime)) {
      return badRequest("The file must be a PDF, JPEG, or PNG.");
    }
    const bytes = base64DecodedLength(body.dataBase64);
    if (bytes == null) {
      return badRequest("The file encoding is not valid base64.");
    }
    if (bytes > MAX_BYTES) {
      return badRequest("The file must be 4 MB or smaller.");
    }
    inlineData = { mimeType: body.mime, data: body.dataBase64.replace(/\s/g, "") };
  } else if (body.text) {
    if (body.mime != null && body.mime !== "text/plain") {
      return badRequest("Spreadsheet text must use the text/plain type.");
    }
    if (body.text.length > MAX_TEXT) {
      return badRequest("Spreadsheet text must be 500,000 characters or fewer.");
    }
    documentText = body.text;
  }

  const apiKey = env.GEMINI_API_KEY?.trim();
  const turnstileSecret = env.TURNSTILE_SECRET?.trim();
  if (!apiKey || !turnstileSecret) {
    return json({ ok: false, error: "unconfigured", message: "Extraction is not configured." }, 503);
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const ip = clientIp(request);
  const allowed = await env.EXTRACT_LIMITER.limit({ key: ip });
  if (!allowed.success) {
    return json({ ok: false, error: "rate_limited", message: "Too many extractions from this network. Try again in a minute." }, 429);
  }

  const human = await verifyTurnstile(body.turnstileToken, turnstileSecret, ip === "unknown" ? "" : ip, fetchImpl);
  if (!human) {
    return json({ ok: false, error: "turnstile", message: "The spam check failed. Reload the page and try again." }, 403);
  }

  const now = deps.now ?? new Date();
  const cap = dailyCap(env.DAILY_CAP);
  try {
    const result = await runExtraction({
      apiKey,
      model: configuredModel(env),
      escalationModel: optionalEnv(env.GEMINI_ESCALATION_MODEL),
      thinkingLevel: thinkingLevel(env.GEMINI_THINKING_LEVEL),
      inlineData,
      documentText,
      fetchImpl,
      sleep: deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
      reserve: () => reserveDailyCall(env.USAGE_KV, cap, now),
      now,
      timeoutMs: deps.timeoutMs,
    });
    return json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ExtractFailure) {
      const status =
        error.code === "quota" || error.code === "daily_cap" ? 429 : error.code === "schema" ? 422 : error.code === "timeout" ? 504 : 502;
      return json({ ok: false, error: error.code, message: error.message }, status);
    }
    return json({ ok: false, error: "upstream", message: UPSTREAM_MESSAGE }, 502);
  }
}
