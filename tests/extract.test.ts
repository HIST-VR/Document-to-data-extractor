import { describe, expect, it } from "vitest";
import { dailyCap, QUOTA_MESSAGE, thinkingLevel } from "../functions/env";
import { handleConfig, handleExtract } from "../functions/handle-extract";
import type { Env, UsageKv } from "../functions/env";
import { SYSTEM_PROMPT } from "../functions/prompts";
import { emptySourced } from "../shared/schemas";
import { invoice, line, sourced } from "./fixture";

const now = new Date("2026-10-16T12:00:00Z");

function memoryKv(): UsageKv {
  const store = new Map<string, string>();
  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

function env(overrides: Partial<Env> = {}): Env {
  return {
    GEMINI_API_KEY: "test-key",
    TURNSTILE_SECRET: "turnstile-secret",
    TURNSTILE_SITE_KEY: "site-key",
    GEMINI_MODEL: "gemini-3.5-flash-lite",
    USAGE_KV: memoryKv(),
    EXTRACT_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides,
  };
}

interface GeminiCall {
  url: string;
  body: {
    systemInstruction: { parts: Array<{ text: string }> };
    contents: Array<{ parts: Array<Record<string, unknown>> }>;
    generationConfig: Record<string, unknown>;
  };
  headers: Record<string, string>;
}

function scriptedFetch(replies: Array<{ status: number; body: unknown }>) {
  const gemini: GeminiCall[] = [];
  let index = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("siteverify")) {
      const params = new URLSearchParams(String(init?.body ?? ""));
      const success = params.get("secret") === "turnstile-secret" && params.get("response") === "ok-token";
      return Response.json({ success });
    }
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = JSON.parse(String(init?.body ?? "{}")) as GeminiCall["body"];
    gemini.push({ url, body, headers });
    const reply = replies[index] ?? { status: 500, body: { error: { message: "unscripted" } } };
    index += 1;
    return Response.json(reply.body, { status: reply.status });
  };
  return { fetchImpl, gemini };
}

function model(payload: unknown, options?: { thought?: boolean; raw?: string }) {
  const text = options?.raw ?? (typeof payload === "string" ? payload : JSON.stringify(payload));
  const parts: Array<Record<string, unknown>> = [];
  if (options?.thought) {
    parts.push({ thought: true, text: "hidden reasoning" });
  }
  parts.push({ text });
  return { status: 200, body: { candidates: [{ content: { parts } }] } };
}

function post(body: unknown, ip = "203.0.113.5"): Request {
  return new Request("https://doclens.test/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify(body),
  });
}

const fileBody = {
  mime: "application/pdf",
  dataBase64: "YQ==",
  turnstileToken: "ok-token",
};

async function read(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("prompt and env helpers", () => {
  it("includes the required extraction rules", () => {
    expect(SYSTEM_PROMPT).toContain("Extract only what is printed.");
    expect(SYSTEM_PROMPT).toContain("Copy evidence verbatim.");
    expect(SYSTEM_PROMPT).toContain("Use null if absent.");
    expect(SYSTEM_PROMPT).toContain("Documents may be Ukrainian, Russian, or English.");
    expect(SYSTEM_PROMPT).toContain("Do not translate names.");
  });

  it("accepts only the documented thinking levels and daily cap", () => {
    expect(thinkingLevel(" LOW ")).toBe("low");
    expect(thinkingLevel("turbo")).toBeUndefined();
    expect(thinkingLevel(undefined)).toBeUndefined();
    expect(dailyCap(undefined)).toBe(100);
    expect(dailyCap("0")).toBe(0);
    expect(dailyCap("nope")).toBe(100);
    expect(dailyCap("-3")).toBe(100);
  });
});

describe("handleConfig", () => {
  it("reports free terms by default and paid terms when set", () => {
    expect(handleConfig(env()).status).toBe(200);
    return handleConfig(env()).json().then((body) => {
      expect(body).toEqual({ dataTerms: "free", turnstileSiteKey: "site-key" });
    });
  });

  it("hides the warning mode when terms are paid", async () => {
    const body = await handleConfig(env({ GEMINI_DATA_TERMS: "paid", TURNSTILE_SITE_KEY: " public " })).json();
    expect(body).toEqual({ dataTerms: "paid", turnstileSiteKey: "public" });
  });
});

describe("handleExtract", () => {
  it("sends the file to Gemini and returns a validated extraction", async () => {
    const script = scriptedFetch([model(invoice(), { thought: true })]);
    const response = await handleExtract(post(fileBody), env(), { fetchImpl: script.fetchImpl, now });
    expect(response.status).toBe(200);
    const body = await read(response);
    expect(body.ok).toBe(true);
    expect(body.extraction).toMatchObject({ documentType: "invoice", documentNumber: { value: "42" } });
    expect(body.extraction).not.toHaveProperty("escalated");
    expect(body.validation).toMatchObject({ unsupported: false, errorCount: 0 });
    const call = script.gemini[0];
    expect(call?.url).toContain("/models/gemini-3.5-flash-lite:generateContent");
    expect(call?.headers["x-goog-api-key"]).toBe("test-key");
    expect(call?.body.systemInstruction.parts[0]?.text).toContain("Do not translate names.");
    expect(call?.body.generationConfig.temperature).toBe(0);
    expect(call?.body.generationConfig.responseMimeType).toBe("application/json");
    expect(call?.body.generationConfig).not.toHaveProperty("thinkingConfig");
    expect(call?.body.contents[0]?.parts[0]).toEqual({ inlineData: { mimeType: "application/pdf", data: "YQ==" } });
    expect(JSON.stringify(call?.body)).not.toContain("hidden reasoning");
  });

  it("sends spreadsheet text without inline data", async () => {
    const script = scriptedFetch([model(invoice())]);
    const response = await handleExtract(
      post({ text: "Назва,Сума\nПослуги,100", turnstileToken: "ok-token" }),
      env(),
      { fetchImpl: script.fetchImpl, now },
    );
    expect(response.status).toBe(200);
    expect(script.gemini[0]?.body.contents[0]?.parts.some((part) => "inlineData" in part)).toBe(false);
    expect(script.gemini[0]?.body.contents[0]?.parts[0]).toEqual({ text: "Назва,Сума\nПослуги,100" });
  });

  it("strips base64 whitespace before the model sees the file", async () => {
    const script = scriptedFetch([model(invoice())]);
    await handleExtract(post({ ...fileBody, dataBase64: "YQ==\n" }), env(), { fetchImpl: script.fetchImpl, now });
    expect(script.gemini[0]?.body.contents[0]?.parts[0]).toEqual({
      inlineData: { mimeType: "application/pdf", data: "YQ==" },
    });
  });

  it("retries once when the model JSON does not match the schema", async () => {
    const script = scriptedFetch([model({ documentType: "nope" }), model(invoice())]);
    const response = await handleExtract(post(fileBody), env(), { fetchImpl: script.fetchImpl, now });
    expect(response.status).toBe(200);
    expect(script.gemini).toHaveLength(2);
    const note = JSON.stringify(script.gemini[1]?.body);
    expect(note).toContain("failed schema validation");
    expect(note).toContain("documentType");
  });

  it("accepts a fenced JSON payload", async () => {
    const script = scriptedFetch([model(invoice(), { raw: `\`\`\`json\n${JSON.stringify(invoice())}\n\`\`\`` })]);
    const response = await handleExtract(post(fileBody), env(), { fetchImpl: script.fetchImpl, now });
    expect(response.status).toBe(200);
  });

  it("returns a schema error after the retry also fails", async () => {
    const script = scriptedFetch([model("not-json"), model("still-not")]);
    const response = await handleExtract(post(fileBody), env(), { fetchImpl: script.fetchImpl, now });
    expect(response.status).toBe(422);
    expect(await read(response)).toMatchObject({ ok: false, error: "schema" });
  });

  it("returns the quota message on HTTP 429 and does not retry", async () => {
    const sleeps: number[] = [];
    const script = scriptedFetch([{ status: 429, body: { error: { status: "RESOURCE_EXHAUSTED", message: "quota" } } }]);
    const response = await handleExtract(post(fileBody), env(), {
      fetchImpl: script.fetchImpl,
      now,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(response.status).toBe(429);
    expect(await read(response)).toEqual({ ok: false, error: "quota", message: QUOTA_MESSAGE });
    expect(script.gemini).toHaveLength(1);
    expect(sleeps).toEqual([]);
  });

  it("treats RESOURCE_EXHAUSTED on other statuses as quota", async () => {
    const script = scriptedFetch([{ status: 400, body: { error: { status: "RESOURCE_EXHAUSTED", message: "slow down" } } }]);
    const response = await handleExtract(post(fileBody), env(), { fetchImpl: script.fetchImpl, now });
    expect((await read(response)).error).toBe("quota");
  });

  it("backs off on 5xx and then accepts a later success", async () => {
    const sleeps: number[] = [];
    const script = scriptedFetch([
      { status: 503, body: { error: { message: "unavailable" } } },
      { status: 500, body: { error: { message: "unavailable" } } },
      model(invoice()),
    ]);
    const response = await handleExtract(post(fileBody), env(), {
      fetchImpl: script.fetchImpl,
      now,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(response.status).toBe(200);
    expect(sleeps).toEqual([500, 1500]);
    expect(script.gemini).toHaveLength(3);
  });

  it("stops after two 5xx retries", async () => {
    const script = scriptedFetch([
      { status: 500, body: {} },
      { status: 502, body: {} },
      { status: 504, body: {} },
    ]);
    const response = await handleExtract(post(fileBody), env(), {
      fetchImpl: script.fetchImpl,
      now,
      sleep: async () => {},
    });
    expect(response.status).toBe(502);
    expect((await read(response)).error).toBe("upstream");
    expect(script.gemini).toHaveLength(3);
  });

  it("drops temperature when the model rejects it", async () => {
    const script = scriptedFetch([
      { status: 400, body: { error: { message: "temperature is not supported" } } },
      model(invoice()),
    ]);
    const response = await handleExtract(post(fileBody), env(), { fetchImpl: script.fetchImpl, now });
    expect(response.status).toBe(200);
    expect(script.gemini[0]?.body.generationConfig.temperature).toBe(0);
    expect(script.gemini[1]?.body.generationConfig).not.toHaveProperty("temperature");
  });

  it("sends a thinking level only when the env value is valid", async () => {
    const script = scriptedFetch([model(invoice())]);
    await handleExtract(post(fileBody), env({ GEMINI_THINKING_LEVEL: "minimal" }), {
      fetchImpl: script.fetchImpl,
      now,
    });
    expect(script.gemini[0]?.body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });

    const ignored = scriptedFetch([model(invoice())]);
    await handleExtract(post(fileBody), env({ GEMINI_THINKING_LEVEL: "turbo" }), {
      fetchImpl: ignored.fetchImpl,
      now,
    });
    expect(ignored.gemini[0]?.body.generationConfig).not.toHaveProperty("thinkingConfig");
  });

  it("escalates once when validation finds at least three errors", async () => {
    const broken = invoice({
      lineItems: [
        line({ quantity: 2, unitPrice: 100, amount: 180, vatRate: 0 }),
        line({ quantity: 1, unitPrice: 10, amount: 9, vatRate: 0 }),
        line({ quantity: 3, unitPrice: 5, amount: 10, vatRate: 0 }),
      ],
      subtotal: sourced(199),
      vatTotal: sourced(0),
      total: sourced(199),
      totalInWords: sourced("Сто дев'яносто дев'ять гривень 00 копійок"),
    });
    const script = scriptedFetch([model(broken), model(invoice())]);
    const response = await handleExtract(post(fileBody), env({ GEMINI_ESCALATION_MODEL: "gemini-escalation" }), {
      fetchImpl: script.fetchImpl,
      now,
    });
    const body = await read(response);
    expect(response.status).toBe(200);
    expect(body.extraction).toMatchObject({ escalated: true, documentNumber: { value: "42" } });
    expect(script.gemini[1]?.url).toContain("/models/gemini-escalation:generateContent");
  });

  it("keeps the first result when escalation does not return a schema", async () => {
    const broken = invoice({
      lineItems: [line({ amount: 1 }), line({ amount: 1 }), line({ amount: 1 })],
      subtotal: sourced(3),
      vatTotal: sourced(0.6),
      total: sourced(3.6),
      totalInWords: emptySourced<string>(),
    });
    const script = scriptedFetch([model(broken), model("nope"), model("nope")]);
    const response = await handleExtract(post(fileBody), env({ GEMINI_ESCALATION_MODEL: "gemini-escalation" }), {
      fetchImpl: script.fetchImpl,
      now,
    });
    const body = await read(response);
    expect(response.status).toBe(200);
    expect(body.extraction).not.toHaveProperty("escalated");
    expect(script.gemini).toHaveLength(3);
  });

  it("does not escalate an unsupported document", async () => {
    const script = scriptedFetch([model({ ...invoice(), documentType: "unknown" })]);
    const response = await handleExtract(post(fileBody), env({ GEMINI_ESCALATION_MODEL: "gemini-escalation" }), {
      fetchImpl: script.fetchImpl,
      now,
    });
    const body = await read(response);
    expect(body.validation).toMatchObject({ unsupported: true, errorCount: 0 });
    expect(body.extraction).toMatchObject({ documentType: "unknown", lineItems: [] });
    expect(script.gemini).toHaveLength(1);
  });

  it("maps an aborted model call to a timeout", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      if (String(input).includes("siteverify")) {
        return Response.json({ success: true });
      }
      await new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
      return new Response(null, { status: 500 });
    };
    const response = await handleExtract(post(fileBody), env(), { fetchImpl, now, timeoutMs: 20 });
    expect(response.status).toBe(504);
    expect((await read(response)).error).toBe("timeout");
  });

  it("maps a network failure to upstream", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input).includes("siteverify")) {
        return Response.json({ success: true });
      }
      throw new Error("socket");
    };
    const response = await handleExtract(post(fileBody), env(), { fetchImpl, now });
    expect(response.status).toBe(502);
  });

  it("rejects oversized, mistyped, and badly encoded files", async () => {
    const tooBig = "A".repeat(5_600_000 - (5_600_000 % 4));
    const cases = [
      [{ ...fileBody, dataBase64: tooBig }, "4 MB"],
      [{ ...fileBody, mime: "image/gif" }, "PDF, JPEG, or PNG"],
      [{ ...fileBody, dataBase64: "!!!!" }, "base64"],
      [{ text: "a".repeat(500_001), turnstileToken: "ok-token" }, "500,000"],
      [{ text: "hello", mime: "application/pdf", turnstileToken: "ok-token" }, "text/plain"],
      [{ ...fileBody, text: "also" }, "not both"],
      [{ turnstileToken: "ok-token" }, "file or document text"],
    ] as const;
    for (const [body, fragment] of cases) {
      const response = await handleExtract(post(body), env(), { now });
      expect(response.status).toBe(400);
      expect(JSON.stringify(await response.json())).toContain(fragment);
    }
  });

  it("rejects a missing token, bad JSON, and the wrong method", async () => {
    expect((await handleExtract(post({ mime: "application/pdf", dataBase64: "YQ==" }), env(), { now })).status).toBe(400);
    const badJson = new Request("https://doclens.test/api/extract", { method: "POST", body: "{" });
    expect((await handleExtract(badJson, env(), { now })).status).toBe(400);
    const get = new Request("https://doclens.test/api/extract", { method: "GET" });
    expect((await handleExtract(get, env(), { now })).status).toBe(405);
  });

  it("blocks a failed Turnstile check and a rate limit before calling Gemini", async () => {
    const turnstile = scriptedFetch([]);
    const denied = await handleExtract(post({ ...fileBody, turnstileToken: "nope" }), env(), {
      fetchImpl: turnstile.fetchImpl,
      now,
    });
    expect(denied.status).toBe(403);
    expect(turnstile.gemini).toHaveLength(0);

    const limited = scriptedFetch([model(invoice())]);
    const response = await handleExtract(post(fileBody), env({
      EXTRACT_LIMITER: { limit: async () => ({ success: false }) },
    }), { fetchImpl: limited.fetchImpl, now });
    expect(response.status).toBe(429);
    expect((await read(response)).error).toBe("rate_limited");
    expect(limited.gemini).toHaveLength(0);
  });

  it("stops when the daily cap is already spent", async () => {
    const script = scriptedFetch([model(invoice())]);
    const response = await handleExtract(post(fileBody), env({ DAILY_CAP: "0" }), {
      fetchImpl: script.fetchImpl,
      now,
    });
    expect(response.status).toBe(429);
    expect((await read(response)).error).toBe("daily_cap");
    expect(script.gemini).toHaveLength(0);
  });

  it("reports a missing configuration without calling the model", async () => {
    const script = scriptedFetch([model(invoice())]);
    const response = await handleExtract(post(fileBody), env({ GEMINI_API_KEY: "  " }), {
      fetchImpl: script.fetchImpl,
      now,
    });
    expect(response.status).toBe(503);
    expect(script.gemini).toHaveLength(0);
  });
});
