export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_PDF_PAGES = 5;
export const MAX_TEXT_CHARS = 500_000;

export type FileKind = "pdf" | "image" | "sheet";
export type FileIssue = "size" | "type" | "empty";

export interface AcceptedFile {
  ok: true;
  kind: FileKind;
  mime: string;
}

export interface RejectedFile {
  ok: false;
  issue: FileIssue;
}

interface KnownType {
  kind: FileKind;
  mime: string;
}

const BY_EXTENSION: Record<string, KnownType> = {
  pdf: { kind: "pdf", mime: "application/pdf" },
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  png: { kind: "image", mime: "image/png" },
  csv: { kind: "sheet", mime: "text/csv" },
  xlsx: {
    kind: "sheet",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

function mimeAgrees(reported: string, known: KnownType): boolean {
  const type = reported.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!type || type === "application/octet-stream") return true;
  if (known.kind === "pdf") return type === "application/pdf";
  if (known.kind === "image") return type === known.mime || type === "image/jpg";
  if (known.mime === "text/csv") {
    return type === "text/csv" || type === "text/plain" || type === "application/vnd.ms-excel";
  }
  return type === known.mime || type === "application/zip";
}

export function classifyFile(file: { name: string; type: string; size: number }): AcceptedFile | RejectedFile {
  if (file.size <= 0) return { ok: false, issue: "empty" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, issue: "size" };
  const known = BY_EXTENSION[extensionOf(file.name)];
  if (!known || !mimeAgrees(file.type, known)) return { ok: false, issue: "type" };
  return { ok: true, kind: known.kind, mime: known.mime };
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
