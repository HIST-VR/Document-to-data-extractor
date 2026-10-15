import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MODEL, optionalEnv, thinkingLevel } from "../../functions/env.ts";
import { runExtraction } from "../../functions/gemini.ts";
import { validateExtraction } from "../../shared/validate.ts";
import { callWithBackoff, DOCUMENT_GAP_MS, sleep } from "./backoff.mjs";
import { buildCorpus, EVAL_NOW } from "./corpus.mjs";
import { renderDocument } from "./render.mjs";
import { catchPlanted, compareFields } from "./score.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(root, "eval", "corpus");
const now = new Date(EVAL_NOW);

function readKey() {
  const fromEnv = process.env.GEMINI_API_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const path = join(root, ".dev.vars");
  if (!existsSync(path)) {
    return "";
  }
  const text = readFileSync(path, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("GEMINI_API_KEY=")) {
      continue;
    }
    return line.slice("GEMINI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function validatorSection(rows) {
  const lines = [
    "| Document | Type | File | Validation errors | Planted | Caught |",
    "| --- | --- | --- | ---: | ---: | ---: |",
  ];
  let planted = 0;
  let caught = 0;
  for (const row of rows) {
    planted += row.planted.total;
    caught += row.planted.caught;
    lines.push(
      `| ${row.id} | ${row.documentType} | ${row.file} | ${row.errorCount} | ${row.planted.total} | ${row.planted.caught} |`,
    );
  }
  lines.push("");
  lines.push(`Planted defects caught on the printed ground truth: ${caught} of ${planted}.`);
  lines.push("This table is the shared validator. It is not a model score.");
  return lines.join("\n");
}

function modelSection(live) {
  if (!live) {
    return "The live Gemini run was not done because GEMINI_API_KEY was not set. This report has no field-accuracy number.";
  }
  const lines = [
    `Model: ${live.model}. One document at a time. ${DOCUMENT_GAP_MS / 1000} seconds between documents. On HTTP 429, the runner waits 20 seconds and then 40 seconds.`,
    "Field accuracy compares JSON values with the printed ground truth. Evidence strings are not compared.",
    "",
  ];
  if (live.rows.length === 0) {
    lines.push(`The run stopped on ${live.stopped.id} (${live.stopped.code}) before any document finished.`);
    return lines.join("\n");
  }
  lines.push("| Document | Fields matched | Missed paths | Planted caught on model output | Escalated |");
  lines.push("| --- | ---: | --- | ---: | --- |");
  for (const row of live.rows) {
    const missed = row.missed.length > 0 ? row.missed.join(", ") : "—";
    lines.push(
      `| ${row.id} | ${row.matched}/${row.total} | ${missed} | ${row.planted.caught}/${row.planted.total} | ${row.escalated ? "yes" : "no"} |`,
    );
  }
  if (live.stopped) {
    lines.push("");
    lines.push(`The run stopped on ${live.stopped.id} (${live.stopped.code}). Later documents were not sent.`);
    return lines.join("\n");
  }
  const matched = live.rows.reduce((sum, row) => sum + row.matched, 0);
  const total = live.rows.reduce((sum, row) => sum + row.total, 0);
  lines.push("");
  lines.push(`Field accuracy across ${live.rows.length} documents: ${matched}/${total}.`);
  return lines.join("\n");
}

async function extractOne(doc, apiKey, model) {
  const bytes = readFileSync(join(outDir, doc.file));
  return runExtraction({
    apiKey,
    model,
    escalationModel: optionalEnv(process.env.GEMINI_ESCALATION_MODEL),
    thinkingLevel: thinkingLevel(process.env.GEMINI_THINKING_LEVEL),
    inlineData: {
      mimeType: doc.mimeType,
      data: Buffer.from(bytes).toString("base64"),
    },
    fetchImpl: fetch,
    sleep,
    reserve: async () => true,
    now,
  });
}

async function liveRun(corpus, apiKey) {
  const model = optionalEnv(process.env.GEMINI_MODEL) || DEFAULT_MODEL;
  const rows = [];
  let stopped = null;
  for (let index = 0; index < corpus.length; index += 1) {
    if (index > 0) {
      await sleep(DOCUMENT_GAP_MS);
    }
    const doc = corpus[index];
    try {
      const result = await callWithBackoff(() => extractOne(doc, apiKey, model));
      const compared = compareFields(doc.extraction, result.extraction);
      rows.push({
        id: doc.id,
        matched: compared.matched,
        total: compared.total,
        missed: compared.missed,
        planted: catchPlanted(result.validation.checks, doc.planted),
        escalated: result.extraction.escalated === true,
      });
      console.log(`${doc.id} ${compared.matched}/${compared.total}`);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "failed";
      stopped = { id: doc.id, code };
      console.log(`${doc.id} stopped ${code}`);
      break;
    }
  }
  return { model, rows, stopped };
}

const corpus = buildCorpus();
await mkdir(outDir, { recursive: true });
for (const doc of corpus) {
  await writeFile(join(outDir, `${doc.id}.html`), doc.html, "utf8");
  const payload = {
    id: doc.id,
    mimeType: doc.mimeType,
    file: doc.file,
    planted: doc.planted,
    extraction: doc.extraction,
  };
  await writeFile(join(outDir, `${doc.id}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await renderDocument(doc, outDir);
  console.log(`rendered ${doc.id}`);
}

const validatorRows = corpus.map((doc) => {
  const validation = validateExtraction(doc.extraction, now);
  return {
    id: doc.id,
    documentType: doc.extraction.documentType,
    file: doc.file,
    errorCount: validation.errorCount,
    planted: catchPlanted(validation.checks, doc.planted),
  };
});

const key = readKey();
const live = key ? await liveRun(corpus, key) : null;
const report = [
  "# Eval report",
  "",
  "Twelve synthetic documents. Companies, names, and identifiers are fictional. HTML is rendered to PDF in headless Edge or Chrome, except `invoice-scan`, which is a PNG screenshot of the same HTML with a grayscale filter.",
  "",
  "## Validator",
  "",
  validatorSection(validatorRows),
  "",
  "## Model",
  "",
  modelSection(live),
  "",
].join("\n");
await writeFile(join(root, "eval", "report.md"), report, "utf8");
console.log(key ? "wrote eval/report.md" : "wrote eval/report.md (no live run)");
