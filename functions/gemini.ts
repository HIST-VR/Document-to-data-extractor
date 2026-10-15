import { toGeminiSchema, safeParseExtraction } from "../shared/schemas";
import type { Extraction, ResultExtraction, ValidationReport } from "../shared/types";
import { validateExtraction } from "../shared/validate";
import {
  DAILY_CAP_MESSAGE,
  QUOTA_MESSAGE,
  SCHEMA_MESSAGE,
  TIMEOUT_MESSAGE,
  UPSTREAM_MESSAGE,
} from "./env";
import { extractionInstruction, schemaRetryNote, SYSTEM_PROMPT } from "./prompts";

const GEMINI_SCHEMA = toGeminiSchema();
const BACKOFF_MS = [500, 1500] as const;

export type FailureCode = "quota" | "daily_cap" | "upstream" | "schema" | "timeout";

export class ExtractFailure extends Error {
  readonly code: FailureCode;

  constructor(code: FailureCode, message: string) {
    super(message);
    this.name = "ExtractFailure";
    this.code = code;
  }
}

export interface GeminiDeps {
  apiKey: string;
  model: string;
  escalationModel?: string | undefined;
  thinkingLevel?: string | undefined;
  inlineData?: { mimeType: string; data: string } | undefined;
  documentText?: string | undefined;
  fetchImpl: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  reserve: () => Promise<boolean>;
  now: Date;
  timeoutMs?: number | undefined;
}

interface GeminiRequest {
  systemInstruction: { parts: Array<{ text: string }> };
  contents: Array<{ role: "user"; parts: Array<Record<string, unknown>> }>;
  generationConfig: Record<string, unknown>;
}

export function buildGeminiBody(
  deps: Pick<GeminiDeps, "thinkingLevel" | "inlineData" | "documentText">,
  extraNote: string | undefined,
  includeTemperature: boolean,
): GeminiRequest {
  const parts: Array<Record<string, unknown>> = [];
  if (deps.inlineData) {
    parts.push({ inlineData: deps.inlineData });
  }
  if (deps.documentText != null) {
    parts.push({ text: deps.documentText });
  }
  const instruction = extractionInstruction(deps.inlineData ? "file" : "text");
  parts.push({ text: extraNote ? `${instruction}\n\n${extraNote}` : instruction });

  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    responseJsonSchema: GEMINI_SCHEMA,
  };
  if (includeTemperature) {
    generationConfig.temperature = 0;
  }
  if (deps.thinkingLevel) {
    generationConfig.thinkingConfig = { thinkingLevel: deps.thinkingLevel };
  }
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    generationConfig,
  };
}

export function readModelText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) {
    return null;
  }
  const texts: string[] = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const content = (candidate as { content?: unknown }).content;
    if (!content || typeof content !== "object") {
      continue;
    }
    const parts = (content as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) {
      continue;
    }
    for (const part of parts) {
      if (!part || typeof part !== "object") {
        continue;
      }
      const record = part as { thought?: unknown; text?: unknown };
      if (record.thought === true || typeof record.text !== "string") {
        continue;
      }
      const text = record.text.trim();
      if (text) {
        texts.push(text);
      }
    }
  }
  return texts.length > 0 ? texts.join("\n") : null;
}

function unwrapJson(text: string): string {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/u.exec(text.trim());
  return fenced?.[1]?.trim() ?? text.trim();
}

function errorBlob(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const error = (payload as { error?: { status?: unknown; message?: unknown } }).error;
  return `${String(error?.status ?? "")} ${String(error?.message ?? "")}`;
}

function summarizeIssues(error: { issues: Array<{ path: PropertyKey[]; code: string }> }): string {
  return error.issues
    .map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.code}`)
    .join("; ")
    .slice(0, 800);
}

function parseModelPayload(payload: unknown): { ok: true; data: Extraction } | { ok: false; summary: string } {
  const text = readModelText(payload);
  if (!text) {
    return { ok: false, summary: "response was empty" };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(unwrapJson(text));
  } catch {
    return { ok: false, summary: "response was not JSON" };
  }
  const parsed = safeParseExtraction(raw);
  if (!parsed.success) {
    return { ok: false, summary: summarizeIssues(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

type HttpKind = "ok" | "quota" | "temperature" | "retry" | "fatal";

function classifyHttp(status: number, payload: unknown): HttpKind {
  const blob = errorBlob(payload);
  if (status === 429 || blob.includes("RESOURCE_EXHAUSTED")) {
    return "quota";
  }
  if (status >= 200 && status < 300) {
    return "ok";
  }
  if (status === 400 && /temperature/i.test(blob)) {
    return "temperature";
  }
  if (status >= 500 && status <= 599) {
    return "retry";
  }
  return "fatal";
}

async function requestGemini(
  deps: GeminiDeps,
  model: string,
  extraNote: string | undefined,
  includeTemperature: boolean,
): Promise<{ status: number; payload: unknown }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await deps.fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": deps.apiKey,
    },
    body: JSON.stringify(buildGeminiBody(deps, extraNote, includeTemperature)),
    signal: AbortSignal.timeout(deps.timeoutMs ?? 30_000),
  });
  const text = await response.text();
  if (!text) {
    return { status: response.status, payload: null };
  }
  try {
    return { status: response.status, payload: JSON.parse(text) as unknown };
  } catch {
    return { status: response.status, payload: null };
  }
}

async function callModel(deps: GeminiDeps, model: string, extraNote: string | undefined): Promise<unknown> {
  let includeTemperature = true;
  let retries = 0;
  for (;;) {
    if (!(await deps.reserve())) {
      throw new ExtractFailure("daily_cap", DAILY_CAP_MESSAGE);
    }
    let status: number;
    let payload: unknown;
    try {
      ({ status, payload } = await requestGemini(deps, model, extraNote, includeTemperature));
    } catch (error) {
      if (isAbort(error)) {
        throw new ExtractFailure("timeout", TIMEOUT_MESSAGE);
      }
      throw new ExtractFailure("upstream", UPSTREAM_MESSAGE);
    }
    const kind = classifyHttp(status, payload);
    if (kind === "ok") {
      return payload;
    }
    if (kind === "quota") {
      throw new ExtractFailure("quota", QUOTA_MESSAGE);
    }
    if (kind === "temperature" && includeTemperature) {
      includeTemperature = false;
      continue;
    }
    if (kind === "retry" && retries < BACKOFF_MS.length) {
      await deps.sleep(BACKOFF_MS[retries] ?? 1500);
      retries += 1;
      continue;
    }
    throw new ExtractFailure("upstream", UPSTREAM_MESSAGE);
  }
}

async function modelExtraction(deps: GeminiDeps, model: string, extraNote?: string): Promise<Extraction> {
  const first = parseModelPayload(await callModel(deps, model, extraNote));
  if (first.ok) {
    return first.data;
  }
  const second = parseModelPayload(await callModel(deps, model, schemaRetryNote(first.summary)));
  if (!second.ok) {
    throw new ExtractFailure("schema", SCHEMA_MESSAGE);
  }
  return second.data;
}

export async function runExtraction(
  deps: GeminiDeps,
): Promise<{ extraction: ResultExtraction; validation: ValidationReport }> {
  const extraction = await modelExtraction(deps, deps.model);
  const validation = validateExtraction(extraction, deps.now);
  const escalation = deps.escalationModel;
  if (
    escalation &&
    escalation !== deps.model &&
    validation.errorCount >= 3 &&
    extraction.documentType !== "unknown"
  ) {
    try {
      const retried = await modelExtraction(deps, escalation);
      return {
        extraction: { ...retried, escalated: true },
        validation: validateExtraction(retried, deps.now),
      };
    } catch (error) {
      if (error instanceof ExtractFailure && (error.code === "quota" || error.code === "daily_cap")) {
        throw error;
      }
    }
  }
  return { extraction, validation };
}
