import type { Extraction, FieldCheck } from "../../shared/types";

export function flattenFields(extraction: Extraction): Array<[string, unknown]>;
export function compareFields(
  expected: Extraction,
  actual: Extraction,
): { matched: number; total: number; missed: string[] };
export function catchPlanted(
  checks: readonly FieldCheck[],
  planted: ReadonlyArray<{ path: string; code: string }>,
): { caught: number; total: number; rows: Array<{ path: string; code: string; caught: boolean }> };
export function evidenceEntries(value: unknown, out?: Array<[string, number | null]>): Array<[string, number | null]>;
