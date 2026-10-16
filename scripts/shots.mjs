import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shotsRel = process.env.SHOTS_DIR ?? "docs/shots/before";
const outDir = join(root, shotsRel);
const port = 4173;
const base = `http://127.0.0.1:${port}`;
const invoiceJson = join(root, "public", "samples", "invoice.json");
const csv = join(root, "public", "samples", "export.csv");
const quotaMessage = "Free quota used up for today, try a sample document.";

const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "834", width: 834, height: 1112 },
  { name: "1440", width: 1440, height: 900 },
];
const themes = ["light", "dark"];

const browsers = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // The preview is still starting.
    }
    await sleep(500);
  }
  throw new Error("Preview did not start");
}

function startServer() {
  return spawn(
    "npx",
    ["wrangler", "pages", "dev", "dist", "--port", String(port), "--ip", "127.0.0.1"],
    {
      cwd: root,
      shell: true,
      stdio: "pipe",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
}

function stopServer(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { shell: true, stdio: "ignore" });
    return;
  }
  child.kill();
}

async function launch() {
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      // Try the next installed browser.
    }
  }
  const executablePath = browsers.find((path) => existsSync(path));
  if (!executablePath) throw new Error("Chrome or Edge is required for screenshots");
  return chromium.launch({ executablePath, headless: true });
}

async function prepare(page, theme, lang) {
  await page.goto(base);
  await page.evaluate(
    ({ theme: nextTheme, lang: nextLang }) =>
      new Promise((resolve) => {
        localStorage.setItem("doclens-theme", nextTheme);
        localStorage.setItem("doclens-lang", nextLang);
        localStorage.removeItem("doclens-consent");
        const request = indexedDB.deleteDatabase("doclens");
        const done = () => resolve(undefined);
        request.onsuccess = done;
        request.onerror = done;
        request.onblocked = done;
        setTimeout(done, 1500);
      }),
    { theme, lang },
  );
  await page.reload();
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function shot(page, name) {
  await page.screenshot({ path: join(outDir, `${name}.png`) });
}

async function measure(page) {
  return page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const targets = [];
    for (const element of document.querySelectorAll("button, a, input, select, textarea, [role='button'], [role='checkbox']")) {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none" || box.width < 2 || box.height < 2) continue;
      if (box.width < 44 || box.height < 44) {
        targets.push({
          text: (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().slice(0, 48),
          width: Math.round(box.width),
          height: Math.round(box.height),
        });
      }
    }
    const fonts = ["400 16px Onest", "500 16px Onest", "600 32px 'Source Serif 4'", "400 16px 'JetBrains Mono'"].map(
      (spec) => ({ spec, loaded: document.fonts.check(spec) }),
    );
    const probe = document.createElement("span");
    probe.textContent = "ЄДРПОУ";
    probe.style.fontFamily = "Onest, sans-serif";
    document.body.append(probe);
    const cyrillic = Math.round(probe.getBoundingClientRect().width);
    probe.remove();
    return { overflow, targets: targets.slice(0, 30), fonts, cyrillic };
  });
}

async function captureSet(page, viewport, theme, notes, delay) {
  const prefix = `${viewport}-${theme}`;
  const size = viewports.find((item) => item.name === viewport);
  await page.setViewportSize({ width: size.width, height: size.height });
  await prepare(page, theme, "en");
  await shot(page, `${prefix}-home`);
  notes.metrics.push({ name: `${prefix}-home`, ...(await measure(page)) });

  await page.getByRole("button", { name: "UK", exact: true }).click();
  await page.getByRole("heading", { level: 1 }).waitFor();
  await shot(page, `${prefix}-ukrainian`);

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.setInputFiles("input[type=file]", csv);
  await page.getByRole("dialog").waitFor();
  await shot(page, `${prefix}-consent`);
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Review upload terms" }).waitFor();
  await shot(page, `${prefix}-file`);
  notes.metrics.push({ name: `${prefix}-file`, ...(await measure(page)) });

  delay.ms = 1600;
  await page.getByRole("button", { name: /СД-1042/ }).click();
  await page.getByRole("heading", { name: /Working through/ }).waitFor();
  await shot(page, `${prefix}-processing`);
  delay.ms = 0;
  await page.getByRole("heading", { name: /checks passed/ }).waitFor({ timeout: 20_000 });
  await page.locator("canvas, pre").first().waitFor({ timeout: 20_000 });
  await shot(page, `${prefix}-results-ok`);
  notes.metrics.push({ name: `${prefix}-results-ok`, ...(await measure(page)) });

  const summary = page.getByRole("heading", { level: 1 });
  const before = await summary.innerText();
  const amount = page.getByRole("textbox", { name: "Amount" }).first();
  await amount.fill("1");
  await amount.press("Tab");
  const number = page.getByRole("textbox", { name: "Number" });
  await number.fill("");
  await number.press("Tab");
  await summary.filter({ hasNotText: before }).waitFor();
  await summary.scrollIntoViewIfNeeded();
  await shot(page, `${prefix}-results-issues`);

  await page.locator("#field-document-type").selectOption("unknown");
  const unsupported = page.getByRole("heading", { name: "This document is not a supported type." });
  await unsupported.waitFor();
  await unsupported.scrollIntoViewIfNeeded();
  await shot(page, `${prefix}-unsupported`);

  await page.getByRole("button", { name: "DocLens UA home" }).click();
  await page.getByRole("heading", { name: "On this device" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /invoice\.pdf/ }).waitFor();
  await shot(page, `${prefix}-history`);
}

async function enableExtract(page) {
  await page.setInputFiles("input[type=file]", csv);
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Continue" }).click();
  const extract = page.getByRole("button", { name: "Extract" });
  await extract.waitFor({ state: "visible" });
  await page.waitForFunction(
    () => {
      const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Extract");
      return Boolean(button && !button.disabled);
    },
    null,
    { timeout: 25_000 },
  );
}

async function captureLive(page, notes) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page, "light", "en");
  try {
    await enableExtract(page);
  } catch {
    notes.skipped.push("429 and escalated: Turnstile did not issue a token in the headless browser.");
    return;
  }

  await page.route("**/api/extract", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "quota", message: quotaMessage }),
    }),
  );
  await page.getByRole("button", { name: "Extract" }).click();
  await page.getByRole("alert").filter({ hasText: quotaMessage }).waitFor();
  await shot(page, "1440-light-quota");
  await page.unroute("**/api/extract");
  try {
    await page.waitForFunction(
      () => {
        const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Extract");
        return Boolean(button && !button.disabled);
      },
      null,
      { timeout: 15_000 },
    );
    notes.skipped.push("Quota recovery: Extract became available again after the 429.");
  } catch {
    notes.skipped.push("Quota recovery: Extract stayed disabled after the 429.");
  }

  await prepare(page, "light", "en");
  await enableExtract(page);
  const sample = JSON.parse(await readFile(invoiceJson, "utf8"));
  sample.escalated = true;
  await page.route("**/api/extract", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        extraction: sample,
        validation: { passed: 0, total: 0, errorCount: 0, checks: [], unsupported: false },
      }),
    }),
  );
  await page.getByRole("button", { name: "Extract" }).click();
  await page.getByText("A second model ran").waitFor({ timeout: 20_000 });
  await shot(page, "1440-light-escalated");
  await page.unroute("**/api/extract");
}

function runLighthouse() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      `npx --yes lighthouse ${base} --only-categories=performance,accessibility,best-practices,seo --chrome-flags=--headless=new --output=json --output-path=${shotsRel}/lighthouse.json --quiet`,
      { cwd: root, shell: true, stdio: "inherit" },
    );
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`lighthouse ${code}`))));
  });
}

if (!existsSync(join(root, "dist", "index.html"))) {
  throw new Error("dist/index.html is missing. Run npm run build first.");
}

const notes = {
  metrics: [],
  skipped: [],
  attempts: "No attempts panel exists. Schema retry and escalation stay on the server.",
  lighthouse: null,
};
const server = startServer();
let serverLog = "";
server.stdout?.on("data", (chunk) => {
  serverLog += chunk.toString();
});
server.stderr?.on("data", (chunk) => {
  serverLog += chunk.toString();
});
let browser;
try {
  await mkdir(outDir, { recursive: true });
  await waitForServer();
  browser = await launch();
  const page = await browser.newPage();
  const delay = { ms: 0 };
  await page.route("**/api/config", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ dataTerms: "free", turnstileSiteKey: "1x00000000000000000000AA" }),
    }),
  );
  await page.route("**/samples/invoice.json", async (route) => {
    if (delay.ms) await sleep(delay.ms);
    await route.continue();
  });
  for (const viewport of viewports) {
    for (const theme of themes) {
      await captureSet(page, viewport.name, theme, notes, delay);
    }
  }
  await writeFile(join(outDir, "attempts-absent.txt"), `${notes.attempts}\n`);
  await captureLive(page, notes);
  await browser.close();
  browser = undefined;
  try {
    await runLighthouse();
    const report = JSON.parse(await readFile(join(outDir, "lighthouse.json"), "utf8"));
    notes.lighthouse = Object.fromEntries(
      Object.entries(report.categories).map(([key, category]) => [key, Math.round(category.score * 100)]),
    );
  } catch (error) {
    notes.lighthouseError = String(error);
  }
  await writeFile(join(outDir, "metrics.json"), `${JSON.stringify(notes, null, 2)}\n`);
  console.log(`DONE: shots ${notes.lighthouse ? JSON.stringify(notes.lighthouse) : notes.lighthouseError}`);
} catch (error) {
  await writeFile(join(outDir, "server.log"), serverLog).catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  stopServer(server);
}
