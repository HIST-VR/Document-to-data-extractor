import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, bytesToBase64, classifyFile } from "../src/lib/files";
import { buildLivePayload, sampleUrls } from "../src/lib/pipeline";

describe("classifyFile", () => {
  it("accepts a pdf, a jpeg, and a spreadsheet by extension", () => {
    expect(classifyFile({ name: "a.PDF", type: "", size: 10 })).toEqual({
      ok: true,
      kind: "pdf",
      mime: "application/pdf",
    });
    expect(classifyFile({ name: "scan.jpg", type: "image/jpeg", size: 10 }).ok).toBe(true);
    expect(classifyFile({ name: "book.xlsx", type: "application/octet-stream", size: 10 })).toMatchObject({
      ok: true,
      kind: "sheet",
    });
  });

  it("rejects an empty file, an oversize file, and a mismatched type", () => {
    expect(classifyFile({ name: "a.pdf", type: "application/pdf", size: 0 })).toEqual({ ok: false, issue: "empty" });
    expect(classifyFile({ name: "a.pdf", type: "application/pdf", size: MAX_FILE_BYTES + 1 })).toEqual({
      ok: false,
      issue: "size",
    });
    expect(classifyFile({ name: "a.pdf", type: "text/html", size: 10 })).toEqual({ ok: false, issue: "type" });
    expect(classifyFile({ name: "notes.txt", type: "text/plain", size: 10 })).toEqual({ ok: false, issue: "type" });
  });
});

describe("live payload", () => {
  it("encodes bytes and sends either a file or text", () => {
    expect(bytesToBase64(new Uint8Array([104, 105]))).toBe("aGk=");
    expect(
      buildLivePayload({ kind: "pdf", mime: "application/pdf", base64: "aGk=", token: "ok-token" }),
    ).toEqual({
      mime: "application/pdf",
      dataBase64: "aGk=",
      turnstileToken: "ok-token",
    });
    expect(buildLivePayload({ kind: "sheet", mime: "text/csv", text: "a;b", token: "ok-token" })).toEqual({
      text: "a;b",
      turnstileToken: "ok-token",
    });
    expect(buildLivePayload({ kind: "sheet", mime: "text/csv", text: "   ", token: "ok-token" })).toEqual({
      error: "empty-text",
    });
  });

  it("keeps sample URLs on static files", () => {
    expect(sampleUrls("invoice")).toEqual({ file: "/samples/invoice.pdf", data: "/samples/invoice.json" });
    expect(sampleUrls("export").file).toBe("/samples/export.csv");
    for (const id of ["invoice", "act", "waybill", "export"] as const) {
      const urls = sampleUrls(id);
      expect(urls.file.includes("/api/extract")).toBe(false);
      expect(urls.data.includes("/api/extract")).toBe(false);
    }
  });
});
