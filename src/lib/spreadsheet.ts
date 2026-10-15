export async function spreadsheetToText(file: Blob, name: string): Promise<string> {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const type = file.type.toLowerCase();
  if (extension === "csv" || type === "text/csv" || type.startsWith("text/plain")) {
    return file.text();
  }

  const xlsx = await import("xlsx");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const book = xlsx.read(bytes, { type: "array" });
  return book.SheetNames.map((sheetName) => {
    const sheet = book.Sheets[sheetName];
    if (!sheet) return "";
    return xlsx.utils.sheet_to_csv(sheet);
  })
    .filter((sheet) => sheet.trim() !== "")
    .join("\n\n");
}
