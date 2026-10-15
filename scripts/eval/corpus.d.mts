import type { Extraction } from "../../shared/types";

export const EVAL_NOW: string;

export function buildCorpus(): Array<{
  id: string;
  file: string;
  mimeType: string;
  pages: number;
  planted: Array<{ path: string; code: string }>;
  html: string;
  extraction: Extraction;
}>;
