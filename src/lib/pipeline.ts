import { safeParseExtraction } from "../../shared/schemas";
import type { ResultExtraction } from "../../shared/types";
import { MAX_TEXT_CHARS, bytesToBase64, type FileKind } from "./files";
import { spreadsheetToText } from "./spreadsheet";

export const LIVE_STEPS = ["render", "upload", "model", "validate"] as const;
export const SAMPLE_STEPS = ["render", "validate"] as const;
export type StepId = (typeof LIVE_STEPS)[number];
export const SAMPLE_IDS = ["invoice", "act", "waybill", "export"] as const;
export type SampleId = (typeof SAMPLE_IDS)[number];

export interface LoadedDoc {
  name: string;
  kind: FileKind;
  mime: string;
  pageCount: number | null;
  source: "sample" | "upload" | "history";
  extraction: ResultExtraction;
  file: Blob | null;
  text: string | null;
}

export type PipelineFailure =
  | { ok: false; kind: "message"; message: string }
  | { ok: false; kind: "code"; code: "network" | "schema" | "text-size" | "empty-text" };

export type PipelineResult = { ok: true; doc: LoadedDoc } | PipelineFailure;

export interface LivePayload {
  mime?: string;
  dataBase64?: string;
  text?: string;
  turnstileToken: string;
}

export function sampleUrls(id: SampleId): { file: string; data: string } {
  if (id === "export") {
    return { file: "/samples/export.csv", data: "/samples/export.json" };
  }
  return { file: `/samples/${id}.pdf`, data: `/samples/${id}.json` };
}

export function buildLivePayload(input: {
  kind: FileKind;
  mime: string;
  base64?: string | undefined;
  text?: string | undefined;
  token: string;
}): LivePayload | { error: "text-size" | "empty-text" | "missing" } {
  if (input.kind === "sheet") {
    const text = input.text ?? "";
    if (text.trim() === "") return { error: "empty-text" };
    if (text.length > MAX_TEXT_CHARS) return { error: "text-size" };
    return { text, turnstileToken: input.token };
  }
  if (!input.base64) return { error: "missing" };
  return { mime: input.mime, dataBase64: input.base64, turnstileToken: input.token };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFailure(value: ResultExtraction | PipelineFailure): value is PipelineFailure {
  return "kind" in value && value.ok === false;
}

function readExtraction(body: unknown): ResultExtraction | PipelineFailure {
  if (!isRecord(body) || body.ok !== true) {
    const message = isRecord(body) && typeof body.message === "string" ? body.message : "";
    return message ? { ok: false, kind: "message", message } : { ok: false, kind: "code", code: "network" };
  }
  const escalated = isRecord(body.extraction) && body.extraction.escalated === true;
  const parsed = safeParseExtraction(body.extraction);
  if (!parsed.success) return { ok: false, kind: "code", code: "schema" };
  return escalated ? { ...parsed.data, escalated: true } : parsed.data;
}

export async function loadSample(id: SampleId, fetchImpl: typeof fetch = fetch): Promise<PipelineResult> {
  const urls = sampleUrls(id);
  let fileResponse: Response;
  let dataResponse: Response;
  try {
    [fileResponse, dataResponse] = await Promise.all([fetchImpl(urls.file), fetchImpl(urls.data)]);
  } catch {
    return { ok: false, kind: "code", code: "network" };
  }
  if (!fileResponse.ok || !dataResponse.ok) return { ok: false, kind: "code", code: "network" };

  let json: unknown;
  try {
    json = await dataResponse.json();
  } catch {
    return { ok: false, kind: "code", code: "schema" };
  }
  const parsed = safeParseExtraction(json);
  if (!parsed.success) return { ok: false, kind: "code", code: "schema" };

  const file = await fileResponse.blob();
  const name = urls.file.split("/").pop() ?? id;
  const text = id === "export" ? await file.text() : null;
  return {
    ok: true,
    doc: {
      name,
      kind: id === "export" ? "sheet" : "pdf",
      mime: id === "export" ? "text/csv" : "application/pdf",
      pageCount: id === "export" ? null : 1,
      source: "sample",
      extraction: parsed.data,
      file,
      text,
    },
  };
}

export interface PublicConfig {
  dataTerms: "free" | "paid";
  turnstileSiteKey: string;
  status: "ready" | "unavailable";
}

export async function loadConfig(fetchImpl: typeof fetch = fetch): Promise<PublicConfig> {
  try {
    const response = await fetchImpl("/api/config");
    if (!response.ok) {
      return { dataTerms: "free", turnstileSiteKey: "", status: "unavailable" };
    }
    const body: unknown = await response.json();
    if (!isRecord(body) || (body.dataTerms !== "free" && body.dataTerms !== "paid")) {
      return { dataTerms: "free", turnstileSiteKey: "", status: "unavailable" };
    }
    if (typeof body.turnstileSiteKey !== "string") {
      return { dataTerms: body.dataTerms, turnstileSiteKey: "", status: "unavailable" };
    }
    return {
      dataTerms: body.dataTerms,
      turnstileSiteKey: body.turnstileSiteKey,
      status: "ready",
    };
  } catch {
    return { dataTerms: "free", turnstileSiteKey: "", status: "unavailable" };
  }
}

export async function extractLive(options: {
  file: File;
  kind: FileKind;
  mime: string;
  pageCount: number | null;
  token: string;
  fetchImpl?: typeof fetch | undefined;
  onStep?: ((step: StepId) => void) | undefined;
}): Promise<PipelineResult> {
  const onStep = options.onStep ?? (() => undefined);
  const fetchImpl = options.fetchImpl ?? fetch;
  onStep("render");

  let payload: LivePayload;
  let text: string | null = null;
  if (options.kind === "sheet") {
    text = await spreadsheetToText(options.file, options.file.name);
    const built = buildLivePayload({
      kind: "sheet",
      mime: options.mime,
      text,
      token: options.token,
    });
    if ("error" in built) {
      return { ok: false, kind: "code", code: built.error === "missing" ? "empty-text" : built.error };
    }
    payload = built;
  } else {
    const bytes = new Uint8Array(await options.file.arrayBuffer());
    const built = buildLivePayload({
      kind: options.kind,
      mime: options.mime,
      base64: bytesToBase64(bytes),
      token: options.token,
    });
    if ("error" in built) return { ok: false, kind: "code", code: "empty-text" };
    payload = built;
  }

  // The body is already buffered. Upload and the model share one response, so the
  // remaining wait is the model call inside the Pages Function.
  onStep("upload");
  const pending = fetchImpl("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  onStep("model");

  let response: Response;
  try {
    response = await pending;
  } catch {
    return { ok: false, kind: "code", code: "network" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, kind: "code", code: "network" };
  }
  const extraction = readExtraction(body);
  if (isFailure(extraction)) return extraction;

  onStep("validate");
  return {
    ok: true,
    doc: {
      name: options.file.name,
      kind: options.kind,
      mime: options.mime,
      pageCount: options.pageCount,
      source: "upload",
      extraction,
      file: options.file,
      text,
    },
  };
}
