import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { evidenceEntries } from "./score.mjs";

function browserPath() {
  const candidates = [
    process.env.DOCLENS_BROWSER,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter((value) => value && existsSync(value));
  const found = candidates[0];
  if (!found) {
    throw new Error("No Edge or Chrome binary found for HTML to PDF.");
  }
  return found;
}

function runBrowser(args) {
  const profile = mkdtempSync(join(tmpdir(), "doclens-eval-"));
  const result = spawnSync(
    browserPath(),
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--allow-file-access-from-files",
      `--user-data-dir=${profile}`,
      ...args,
    ],
    { encoding: "utf8", timeout: 45_000 },
  );
  rmSync(profile, { recursive: true, force: true });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").slice(0, 400);
    throw new Error(`browser exit ${result.status}: ${detail}`);
  }
}

function squash(value) {
  return value.replace(/[\s\u00A0]+/g, "");
}

async function pdfPages(bytes) {
  const task = getDocument({ data: bytes, disableWorker: true });
  try {
    const document = await task.promise;
    const pages = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (item && typeof item === "object" && "str" in item && typeof item.str === "string") {
          text += item.str;
        }
      }
      pages.push(squash(text));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

export async function renderDocument(doc, outDir) {
  const htmlPath = join(outDir, `${doc.id}.html`);
  const target = join(outDir, doc.file);
  const url = pathToFileURL(htmlPath).href;
  if (doc.mimeType === "image/png") {
    runBrowser([
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=840,1180",
      "--virtual-time-budget=4000",
      `--screenshot=${target}`,
      url,
    ]);
    const bytes = readFileSync(target);
    if (bytes.length < 5_000 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
      throw new Error(`${doc.id} screenshot was not a PNG`);
    }
    return;
  }

  runBrowser([
    "--no-pdf-header-footer",
    "--virtual-time-budget=4000",
    `--print-to-pdf=${target}`,
    url,
  ]);
  const bytes = readFileSync(target);
  if (bytes.length < 1_000 || bytes.subarray(0, 4).toString() !== "%PDF") {
    throw new Error(`${doc.id} print was not a PDF`);
  }
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() !== doc.pages) {
    throw new Error(`${doc.id} rendered ${pdf.getPageCount()} pages, expected ${doc.pages}`);
  }
  const pages = await pdfPages(new Uint8Array(bytes));
  const missing = [];
  for (const [evidence, page] of evidenceEntries(doc.extraction)) {
    const haystack = page == null ? pages.join("") : (pages[page - 1] ?? "");
    if (!haystack.includes(squash(evidence))) {
      missing.push(evidence);
    }
  }
  if (missing.length > 0) {
    throw new Error(`${doc.id} PDF is missing printed text: ${missing.join(" | ")}`);
  }
}
