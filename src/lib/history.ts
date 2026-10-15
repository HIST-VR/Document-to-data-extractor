import type { DocumentType, ResultExtraction } from "../../shared/types";

export const HISTORY_LIMIT = 10;
const DB_NAME = "doclens";
const STORE = "extractions";

export interface HistoryRecord {
  id: string;
  name: string;
  documentType: DocumentType;
  createdAt: string;
  extraction: ResultExtraction;
}

export function keepLatest(records: readonly HistoryRecord[], limit = HISTORY_LIMIT): HistoryRecord[] {
  return [...records]
    .sort((left, right) => (left.createdAt < right.createdAt ? 1 : left.createdAt > right.createdAt ? -1 : 0))
    .slice(0, limit);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("history"));
  });
}

function finish(db: IDBDatabase, tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("history"));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("history"));
    };
  });
}

export async function listHistory(): Promise<HistoryRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const request = tx.objectStore(STORE).getAll();
  const rows = await new Promise<HistoryRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as HistoryRecord[]);
    request.onerror = () => reject(request.error ?? new Error("history"));
  });
  await finish(db, tx);
  return keepLatest(rows);
}

export async function saveExtraction(input: { name: string; extraction: ResultExtraction }): Promise<void> {
  const record: HistoryRecord = {
    id: crypto.randomUUID(),
    name: input.name,
    documentType: input.extraction.documentType,
    createdAt: new Date().toISOString(),
    extraction: input.extraction,
  };
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.put(record);
  const existing = store.getAll();
  existing.onsuccess = () => {
    const rows = existing.result as HistoryRecord[];
    const keep = new Set(keepLatest(rows).map((row) => row.id));
    for (const row of rows) {
      if (!keep.has(row.id)) store.delete(row.id);
    }
  };
  await finish(db, tx);
}

export async function clearHistory(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).clear();
  await finish(db, tx);
}
