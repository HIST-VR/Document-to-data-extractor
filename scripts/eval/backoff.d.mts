export function callWithBackoff(
  run: () => Promise<unknown>,
  wait?: (ms: number) => Promise<void>,
  delays?: number[],
): Promise<unknown>;

export const DOCUMENT_GAP_MS: number;
export const QUOTA_DELAYS_MS: number[];
export function sleep(ms: number): Promise<void>;
