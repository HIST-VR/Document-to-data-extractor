export async function countPdfPages(data: ArrayBuffer): Promise<number> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  }
  const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
  try {
    const document = await task.promise;
    return document.numPages;
  } finally {
    await task.destroy();
  }
}
