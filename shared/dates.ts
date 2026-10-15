export type DateVerdict = "ok" | "invalid" | "implausible" | "missing";

const MIN_ISO = "1991-01-01";
const FUTURE_DAYS = 7;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** Accepts ISO dates (optional time) and Ukrainian DD.MM.YYYY or DD/MM/YYYY. */
export function normalizeDateString(raw: string): string | null {
  const value = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(value);
  const local = /^(\d{2})[./](\d{2})[./](\d{4})$/.exec(value);
  let year: number;
  let month: number;
  let day: number;

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (local) {
    day = Number(local[1]);
    month = Number(local[2]);
    year = Number(local[3]);
  } else {
    return null;
  }

  if (!isRealDate(year, month, day)) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function assessIssueDate(value: string | null, now: Date): DateVerdict {
  if (value == null || value.trim() === "") {
    return "missing";
  }
  const iso = normalizeDateString(value);
  if (!iso) {
    return "invalid";
  }
  const latest = new Date(now.getTime());
  latest.setUTCDate(latest.getUTCDate() + FUTURE_DAYS);
  if (iso < MIN_ISO || iso > isoDay(latest)) {
    return "implausible";
  }
  return "ok";
}
