export const DOCUMENT_GAP_MS = 5_000;
export const QUOTA_DELAYS_MS = [20_000, 40_000];

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function callWithBackoff(run, wait = sleep, delays = QUOTA_DELAYS_MS) {
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code !== "quota" && code !== "daily_cap") {
        throw error;
      }
      const pause = delays[attempt];
      attempt += 1;
      if (pause == null) {
        throw error;
      }
      await wait(pause);
    }
  }
}
