import { loadPdfjs } from "./pdfjs";

export async function countPdfPages(data: ArrayBuffer): Promise<number> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
  try {
    const document = await task.promise;
    return document.numPages;
  } finally {
    await task.destroy();
  }
}
